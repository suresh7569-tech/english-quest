import mongoose from 'mongoose';

const DAY_MS = 86_400_000;
const dayKey = (date) => date.toISOString().slice(0, 10); // UTC day, e.g. 2026-11-01

const progressSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    bestCorrect: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    progress: { type: [progressSchema], default: [] },
  },
  { timestamps: true },
);

/** Adds XP and keeps the daily streak up to date. Call user.save() afterwards. */
userSchema.methods.addActivity = function addActivity(xpGained = 0) {
  const today = dayKey(new Date());
  if (this.lastActiveDate !== today) {
    const yesterday = dayKey(new Date(Date.now() - DAY_MS));
    this.streak = this.lastActiveDate === yesterday ? this.streak + 1 : 1;
    this.lastActiveDate = today;
  }
  this.xp += xpGained;
};

/** Safe shape sent to the client (never includes the password hash). */
userSchema.methods.toPublic = function toPublic() {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY_MS));
  const streakAlive = this.lastActiveDate === today || this.lastActiveDate === yesterday;
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    xp: this.xp,
    streak: streakAlive ? this.streak : 0,
    progress: this.progress.map(({ level, bestCorrect, total, passed }) => ({
      level,
      bestCorrect,
      total,
      passed,
    })),
  };
};

export const User = mongoose.model('User', userSchema);
