"""Speech-to-text microservice: faster-whisper (open-source Whisper) behind a tiny FastAPI app.

Run:  uvicorn main:app --port 8001
"""
import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL", "base.en")  # try "small.en" for better accuracy
MAX_BYTES = 15 * 1024 * 1024

# A prompt full of fillers nudges Whisper to keep "um/uh" instead of silently dropping them.
FILLER_PROMPT = "Umm, let me think, like, hmm... okay, so, uh, here is what I think."

app = FastAPI(title="EnglishQuest STT")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


@app.get("/health")
def health():
    return {"ok": True, "model": MODEL_SIZE}


@app.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    data = file.file.read(MAX_BYTES + 1)
    if not data:
        raise HTTPException(400, "Empty audio file.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Audio file is too large.")

    suffix = Path(file.filename or "speech.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        path = tmp.name

    try:
        segments, info = model.transcribe(
            path,
            language="en",
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,  # skips silence, which also prevents hallucinated text
            initial_prompt=FILLER_PROMPT,
        )
        words, parts = [], []
        for segment in segments:
            parts.append(segment.text.strip())
            for w in segment.words or []:
                words.append(
                    {
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(w.probability, 3),
                    }
                )
    except Exception as exc:  # unreadable or corrupt audio
        raise HTTPException(422, f"Could not read this audio file: {exc}") from exc
    finally:
        os.unlink(path)

    text = " ".join(parts).strip()
    if text.lower().strip(" .,!") == FILLER_PROMPT.lower().strip(" .,!"):
        text, words = "", []  # model echoed the prompt on near-silent audio
    return {"text": text, "duration": round(info.duration, 2), "words": words}
