import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { SpeakingSession } from '../models/SpeakingSession.js';
import { requireAuth } from '../middleware/auth.js';
import { transcribe } from '../services/stt.js';
import { checkGrammar } from '../services/grammar.js';
import { applyFixes } from '../services/fixes.js';
import { buildReport } from '../services/analysis.js';
import { SPEAKING_TOPICS } from '../data/topics.js';
import { HttpError, asyncHandler } from '../utils/http.js';

const router = Router();
router.use(requireAuth);

const TARGET_SECONDS = 120;
const MIN_WORDS = 8;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm';
    cb(ok ? null : new HttpError(400, 'Please upload an audio file.'), ok);
  },
});

const analyzeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'You are analysing too quickly. Wait a minute and try again.' },
});

const topicSchema = z.string().trim().max(200).default('Free speaking');

router.get('/topic', (_req, res) => {
  const topic = SPEAKING_TOPICS[Math.floor(Math.random() * SPEAKING_TOPICS.length)];
  res.json({ topic, seconds: TARGET_SECONDS });
});

router.get('/history', asyncHandler(async (req, res) => {
  const sessions = await SpeakingSession.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(8)
    .select('topic score durationSec createdAt')
    .lean();
  res.json({ sessions });
}));

router.post('/analyze', analyzeLimiter, upload.single('audio'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Please record or upload your audio first.');
  const topic = topicSchema.parse(req.body.topic || undefined);

  const speech = await transcribe(req.file);
  if (speech.words.length < MIN_WORDS) {
    throw new HttpError(422, 'We could not hear enough speech. Speak clearly for at least 20 seconds and try again.');
  }

  const issues = await checkGrammar(speech.text);
  const { metrics, scores, tips } = buildReport(speech, issues, TARGET_SECONDS);
  const correctedText = applyFixes(speech.text, issues);

  await SpeakingSession.create({
    user: req.user._id,
    topic,
    transcript: speech.text,
    correctedText,
    durationSec: metrics.durationSec,
    score: scores.overall,
    scores,
    metrics,
    issues,
    tips,
  });

  const xpGained = Math.round(scores.overall / 2);
  req.user.addActivity(xpGained);
  await req.user.save();

  res.json({
    report: { topic, transcript: speech.text, correctedText, scores, metrics, issues, tips },
    xpGained,
    user: req.user.toPublic(),
  });
}));

export default router;
