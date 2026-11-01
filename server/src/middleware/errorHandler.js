import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../utils/http.js';

export const notFound = (_req, res) => res.status(404).json({ error: 'Route not found.' });

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input.' });
  }
  if (err instanceof multer.MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    return res
      .status(tooBig ? 413 : 400)
      .json({ error: tooBig ? 'Audio is too large (max 10 MB).' : err.message });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });

  console.error(err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
