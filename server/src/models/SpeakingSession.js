import mongoose from 'mongoose';

const speakingSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    transcript: { type: String, required: true },
    correctedText: { type: String, required: true },
    durationSec: { type: Number, required: true },
    score: { type: Number, required: true },
    scores: mongoose.Schema.Types.Mixed,
    metrics: mongoose.Schema.Types.Mixed,
    issues: [mongoose.Schema.Types.Mixed],
    tips: [String],
  },
  { timestamps: true },
);

export const SpeakingSession = mongoose.model('SpeakingSession', speakingSessionSchema);
