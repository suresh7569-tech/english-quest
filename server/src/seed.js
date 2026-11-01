import mongoose from 'mongoose';
import { config } from './config/index.js';
import { Level } from './models/Level.js';
import { levels } from './data/levels.js';

try {
  await mongoose.connect(config.mongoUri);
  await Level.deleteMany({});
  await Level.insertMany(levels);
  console.log(`Seeded ${levels.length} levels (${levels.reduce((n, l) => n + l.questions.length, 0)} questions).`);
} catch (err) {
  console.error('Seeding failed. Is MongoDB running? Try: docker compose up -d\n', err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
