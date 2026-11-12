// Pure functions (no database, no network) so they are easy to unit-test.

const CONTRACTIONS = [
  ["i'm", 'i am'], ["you're", 'you are'], ["we're", 'we are'], ["they're", 'they are'],
  ["it's", 'it is'], ["he's", 'he is'], ["she's", 'she is'], ["that's", 'that is'],
  ["isn't", 'is not'], ["aren't", 'are not'], ["wasn't", 'was not'], ["weren't", 'were not'],
  ["don't", 'do not'], ["doesn't", 'does not'], ["didn't", 'did not'],
  ["can't", 'cannot'], ["won't", 'will not'], ["haven't", 'have not'], ["hasn't", 'has not'],
  ["i've", 'i have'], ["i'll", 'i will'], ["we'll", 'we will'],
].map(([short, long]) => [new RegExp(`\\b${short}\\b`, 'g'), long]);

/** Lower-cases, expands contractions and strips punctuation so "I don't like tea." === "i do not like tea". */
export function normalize(text) {
  let s = String(text ?? '').toLowerCase().replace(/[’‘]/g, "'");
  for (const [pattern, long] of CONTRACTIONS) s = s.replace(pattern, long);
  return s
    .replace(/\bcan not\b/g, 'cannot')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * Grades one answer.
 * Translation answers must match an accepted variant exactly (after normalising). We deliberately
 * avoid fuzzy matching for correctness: "He walk" and "He walks" differ by one letter, and that
 * letter is the whole point of the exercise. Near misses are reported as `almost` instead.
 */
export function gradeAnswer(question, answer) {
  if (question.type === 'mcq') {
    const picked = typeof answer === 'number' ? answer : /^\d+$/.test(String(answer)) ? Number(answer) : -1;
    return {
      correct: picked === question.answerIndex,
      almost: false,
      correctAnswer: question.options[question.answerIndex],
    };
  }

  const given = normalize(answer);
  const targets = question.accepted.map(normalize);
  const correct = given.length > 0 && targets.includes(given);
  const almost =
    !correct &&
    given.length > 0 &&
    targets.some((t) => 1 - levenshtein(given, t) / Math.max(given.length, t.length) >= 0.8);
  return { correct, almost, correctAnswer: question.accepted[0] };
}
