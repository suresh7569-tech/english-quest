// Turns a Whisper transcript (with word timings) plus grammar issues into a feedback report.

const FILLERS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'hmm', 'mm', 'ah']);
const IDEAL_WPM = { min: 110, max: 160 };
const LONG_PAUSE_SECONDS = 1.2;

const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round1 = (n) => Math.round(n * 10) / 10;
const cleanWord = (w) => w.toLowerCase().replace(/[^a-z']/g, '');

export function buildReport({ text, duration, words }, issues, targetSeconds = 120) {
  const tokens = words
    .map((w) => ({ ...w, clean: cleanWord(w.word) }))
    .filter((w) => w.clean);

  const wordCount = tokens.length;
  const wpm = Math.round(wordCount / (Math.max(duration, 1) / 60));
  const uniqueWords = new Set(tokens.map((t) => t.clean)).size;
  const fillerCount =
    tokens.filter((t) => FILLERS.has(t.clean)).length + (text.match(/\byou know\b/gi) || []).length;

  let longPauses = 0;
  let longestPause = 0;
  for (let i = 1; i < tokens.length; i += 1) {
    const gap = tokens[i].start - tokens[i - 1].end;
    if (gap >= LONG_PAUSE_SECONDS) longPauses += 1;
    longestPause = Math.max(longestPause, gap);
  }

  // Free approximation of pronunciation: words Whisper was unsure about are often unclear to listeners too.
  const unclearWords = [
    ...new Set(
      tokens
        .filter((t) => t.probability < 0.5 && t.clean.length >= 3)
        .sort((a, b) => a.probability - b.probability)
        .map((t) => t.clean),
    ),
  ].slice(0, 8);

  const issuesPer100Words = wordCount ? (issues.length / wordCount) * 100 : 0;
  const pace =
    wpm < IDEAL_WPM.min
      ? clamp(100 - (IDEAL_WPM.min - wpm) * 1.5)
      : wpm > IDEAL_WPM.max
        ? clamp(100 - (wpm - IDEAL_WPM.max) * 1.5)
        : 100;

  const scores = {
    grammar: Math.round(clamp(100 - issuesPer100Words * 12)),
    fluency: Math.round(clamp(100 - fillerCount * 4 - longPauses * 6)),
    pace: Math.round(pace),
    length: Math.round(clamp((duration / (targetSeconds * 0.9)) * 100)),
  };
  scores.overall = Math.round(
    scores.grammar * 0.3 + scores.fluency * 0.25 + scores.pace * 0.2 + scores.length * 0.25,
  );

  const metrics = {
    durationSec: Math.round(duration),
    wordCount,
    wpm,
    uniqueWords,
    fillerCount,
    longPauses,
    longestPause: round1(longestPause),
    unclearWords,
  };

  return { metrics, scores, tips: buildTips(metrics, scores, issues.length, targetSeconds) };
}

function buildTips(m, scores, issueCount, targetSeconds) {
  const tips = [];
  if (issueCount > 0) tips.push('Read the corrections below out loud once. Repeating the correct form builds the habit.');
  if (m.durationSec < targetSeconds * 0.6) tips.push('Try to keep going for the full two minutes. Add an example or a short story to each point.');
  if (m.wpm < IDEAL_WPM.min) tips.push('You are speaking slowly. Plan your next sentence while finishing the current one.');
  if (m.wpm > IDEAL_WPM.max) tips.push('You are speaking fast. Pause briefly at the end of each sentence so listeners can follow.');
  if (m.fillerCount > 3) tips.push('Replace “um” and “uh” with a silent pause. A short pause sounds more confident.');
  if (m.longPauses > 3) tips.push('Several long pauses. Keep a simple structure in mind: point, reason, example.');
  if (m.unclearWords.length) tips.push('Practise the highlighted unclear words slowly. Say each one three times, then use it in a sentence.');
  if (!tips.length) tips.push('Great work. Try a harder topic or aim for even more varied vocabulary next time.');
  return tips.slice(0, 4);
}
