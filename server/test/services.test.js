import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer, normalize } from '../src/services/grading.js';
import { applyFixes } from '../src/services/fixes.js';
import { buildReport } from '../src/services/analysis.js';

const translate = { type: 'translate', accepted: ['I do not like tea.', 'He walks to school.'] };
const mcq = { type: 'mcq', options: ['a', 'b'], answerIndex: 0 };

test('normalize expands contractions and ignores case and punctuation', () => {
  assert.equal(normalize("I DON’T like tea!"), 'i do not like tea');
});

test('translation accepts contractions and rejects grammar slips', () => {
  assert.equal(gradeAnswer(translate, "i don't like tea").correct, true);
  assert.equal(gradeAnswer(translate, 'He walk to school').correct, false);
  assert.equal(gradeAnswer(translate, 'He walk to school').almost, true);
  assert.equal(gradeAnswer(translate, '').correct, false);
});

test('mcq grading handles numbers, numeric strings and missing answers', () => {
  assert.equal(gradeAnswer(mcq, 0).correct, true);
  assert.equal(gradeAnswer(mcq, '0').correct, true);
  assert.equal(gradeAnswer(mcq, '').correct, false);
  assert.equal(gradeAnswer(mcq, undefined).correct, false);
});

test('applyFixes edits right-to-left and skips overlapping fixes', () => {
  const text = 'He go to school and discuss about it';
  const issues = [
    { offset: 3, length: 2, suggestion: 'goes' },
    { offset: 20, length: 13, suggestion: 'discuss' }, // overlaps the next fix, so it is skipped
    { offset: 28, length: 5, suggestion: 'on' },
    { offset: 0, length: 2, suggestion: '' }, // no suggestion: ignored
  ];
  assert.equal(applyFixes(text, issues), 'He goes to school and discuss on it');
});

test('buildReport counts fillers, pauses and scores a clean 2-minute talk highly', () => {
  const words = [];
  for (let i = 0; i < 270; i += 1) words.push({ word: `word${i % 90}`, start: i * 0.44, end: i * 0.44 + 0.3, probability: 0.95 });
  words[10] = { word: 'um,', start: 4.4, end: 4.7, probability: 0.9 };
  const { metrics, scores } = buildReport({ text: 'sample text', duration: 120, words }, []);
  assert.equal(metrics.fillerCount, 1);
  assert.equal(metrics.wpm, 135);
  assert.equal(metrics.longPauses, 0);
  assert.ok(scores.overall >= 90);
});
