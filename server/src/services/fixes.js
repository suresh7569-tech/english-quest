// Pure helper (no config or network) so it can be unit-tested on its own.

/** Applies each first suggestion, working right-to-left so earlier offsets stay valid. */
export function applyFixes(text, issues) {
  let result = text;
  let limit = text.length;
  const fixable = issues.filter((i) => i.suggestion).sort((a, b) => b.offset - a.offset);
  for (const { offset, length, suggestion } of fixable) {
    if (offset + length > limit) continue; // overlaps a fix we already applied
    result = result.slice(0, offset) + suggestion + result.slice(offset + length);
    limit = offset;
  }
  return result;
}
