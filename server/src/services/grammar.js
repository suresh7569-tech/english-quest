import { config } from '../config/index.js';
import { HttpError } from '../utils/http.js';

// Whisper's punctuation, casing and spelling are not the speaker's mistakes, so those rules are ignored.
const IGNORED_CATEGORIES = new Set(['TYPOS', 'PUNCTUATION', 'TYPOGRAPHY', 'CASING', 'STYLE', 'COLLOQUIALISMS']);
const MAX_ISSUES = 25;

/** Checks a transcript with a self-hosted LanguageTool server. */
export async function checkGrammar(text) {
  let res;
  try {
    res = await fetch(`${config.languageToolUrl}/v2/check`, {
      method: 'POST',
      body: new URLSearchParams({ text, language: 'en-US' }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new HttpError(502, 'The grammar checker is not running. Start it with: docker compose up -d');
  }
  if (!res.ok) throw new HttpError(502, 'The grammar checker returned an error.');

  const { matches = [] } = await res.json();
  return matches
    .filter((m) => !IGNORED_CATEGORIES.has(m.rule?.category?.id))
    .slice(0, MAX_ISSUES)
    .map((m) => ({
      message: m.message,
      wrong: text.slice(m.offset, m.offset + m.length),
      suggestion: m.replacements?.[0]?.value ?? '',
      offset: m.offset,
      length: m.length,
      ruleId: m.rule?.id,
    }));
}
