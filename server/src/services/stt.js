import { config } from '../config/index.js';
import { HttpError } from '../utils/http.js';

/** Sends an uploaded audio buffer to the local Whisper service. Returns { text, duration, words }. */
export async function transcribe(file) {
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname || 'speech.webm');

  let res;
  try {
    res = await fetch(`${config.sttUrl}/transcribe`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(180_000),
    });
  } catch {
    throw new HttpError(502, 'The speech service is not running. Start it with: uvicorn main:app --port 8001');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const status = res.status === 422 || res.status === 413 ? res.status : 502;
    throw new HttpError(status, body.detail || 'The speech service failed to read this audio.');
  }
  return res.json();
}
