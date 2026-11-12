import { Router } from 'express';
import { z } from 'zod';
import { Level } from '../models/Level.js';
import { requireAuth } from '../middleware/auth.js';
import { gradeAnswer } from '../services/grading.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

const XP_PER_NEW_CORRECT = 10; // XP only for answers beyond your previous best, so retries cannot be farmed
const FIRST_PASS_BONUS = 25;

const answerValue = z.union([z.string().max(300), z.number()]);
const checkSchema = z.object({ questionId: z.string().regex(/^[a-f\d]{24}$/i), answer: answerValue });
const submitSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().regex(/^[a-f\d]{24}$/i), answer: answerValue })).max(50),
});

const progressFor = (user, number) => user.progress.find((p) => p.level === number);
const isUnlocked = (user, number) => number === 1 || Boolean(progressFor(user, number - 1)?.passed);

async function loadUnlockedLevel(req) {
  const number = Number.parseInt(req.params.number, 10);
  if (!Number.isInteger(number) || number < 1) throw new HttpError(400, 'Invalid level.');
  const level = await Level.findOne({ number });
  if (!level) throw new HttpError(404, 'Level not found.');
  if (!isUnlocked(req.user, number)) throw new HttpError(403, 'Pass the previous level to unlock this one.');
  return level;
}

// All levels with the current user's status on each.
router.get('/', asyncHandler(async (req, res) => {
  const levels = await Level.find().sort({ number: 1 }).lean();
  res.json({
    levels: levels.map((l) => {
      const progress = progressFor(req.user, l.number);
      let status = 'locked';
      if (progress?.passed) status = 'completed';
      else if (isUnlocked(req.user, l.number)) status = 'unlocked';
      return {
        number: l.number,
        title: l.title,
        emoji: l.emoji,
        description: l.description,
        passScore: l.passScore,
        questionCount: l.questions.length,
        status,
        bestScore: progress?.total ? Math.round((progress.bestCorrect / progress.total) * 100) : null,
      };
    }),
  });
}));

// One level's questions. Answers are never sent to the browser.
router.get('/:number', asyncHandler(async (req, res) => {
  const level = await loadUnlockedLevel(req);
  res.json({
    level: {
      number: level.number,
      title: level.title,
      emoji: level.emoji,
      passScore: level.passScore,
      questions: level.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.type === 'mcq' ? q.options : undefined,
      })),
    },
  });
}));

// Instant feedback for a single question.
router.post('/:number/check', asyncHandler(async (req, res) => {
  const level = await loadUnlockedLevel(req);
  const { questionId, answer } = checkSchema.parse(req.body);
  const question = level.questions.id(questionId);
  if (!question) throw new HttpError(404, 'Question not found.');
  res.json({ ...gradeAnswer(question, answer), explanation: question.explanation, tipHi: question.tipHi });
}));

// Final, authoritative grading of the whole level. The server re-grades everything.
router.post('/:number/submit', asyncHandler(async (req, res) => {
  const level = await loadUnlockedLevel(req);
  const { answers } = submitSchema.parse(req.body);
  const given = new Map(answers.map((a) => [a.questionId, a.answer]));

  const results = level.questions.map((q) => ({
    questionId: q.id,
    correct: gradeAnswer(q, given.get(q.id)).correct,
  }));
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= level.passScore;

  const user = req.user;
  const existing = progressFor(user, level.number);
  const previousBest = existing?.bestCorrect ?? 0;
  const firstPass = passed && !existing?.passed;

  if (existing) {
    existing.bestCorrect = Math.max(existing.bestCorrect, correct);
    existing.total = total;
    existing.passed = existing.passed || passed;
  } else {
    user.progress.push({ level: level.number, bestCorrect: correct, total, passed });
  }

  const xpGained = Math.max(0, correct - previousBest) * XP_PER_NEW_CORRECT + (firstPass ? FIRST_PASS_BONUS : 0);
  user.addActivity(xpGained);
  await user.save();

  const hasNext = passed && (await Level.exists({ number: level.number + 1 }));
  res.json({
    score,
    correct,
    total,
    passed,
    xpGained,
    results,
    nextLevel: hasNext ? level.number + 1 : null,
    user: user.toPublic(),
  });
}));

export default router;
