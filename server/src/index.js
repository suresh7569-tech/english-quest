import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import levelRoutes from './routes/levels.js';
import speakingRoutes from './routes/speaking.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/speaking', speakingRoutes);

app.use(notFound);
app.use(errorHandler);

try {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected');
} catch (err) {
  console.error('Could not connect to MongoDB. Is it running? Try: docker compose up -d\n', err.message);
  process.exit(1);
}

app.listen(config.port, () => console.log(`API ready on http://localhost:${config.port}`));
