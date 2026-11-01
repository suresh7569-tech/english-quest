import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'translate'], required: true },
  // mcq: an English question. translate: the Hindi sentence to translate.
  prompt: { type: String, required: true },
  options: { type: [String], default: undefined }, // mcq only
  answerIndex: Number, // mcq only
  accepted: { type: [String], default: undefined }, // translate only: every correct English answer
  explanation: String, // short English explanation
  tipHi: String, // short Hindi tip that explains the rule or the common mistake
});

const levelSchema = new mongoose.Schema({
  number: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  emoji: { type: String, default: '📘' },
  description: { type: String, default: '' },
  passScore: { type: Number, default: 70 }, // percent needed to unlock the next level
  questions: [questionSchema],
});

export const Level = mongoose.model('Level', levelSchema);
