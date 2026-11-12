# EnglishQuest

A free, gamified English-learning app for Hindi speakers: level map, MCQ quizzes, Hindi to English
translation exercises, and a 2-minute speaking challenge that transcribes and corrects your speech.
Everything runs on free, open-source tools.

| Part | Tech |
|---|---|
| `client/` | React 18 + Vite, react-router, plain CSS |
| `server/` | Node 20, Express, MongoDB (Mongoose), JWT auth, Zod validation |
| `stt-service/` | Python, FastAPI, **faster-whisper** (open-source Whisper) |
| Grammar | **LanguageTool**, self-hosted via Docker |

## Run it (4 terminals)

Prerequisites: Node 20+, Python 3.10+, Docker.

```bash
# 1) Database + grammar checker (first start downloads the images)
docker compose up -d

# 2) Speech-to-text service (first start downloads the ~150 MB Whisper model)
cd stt-service
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8001

# 3) API
cd server
cp .env.example .env               # then set JWT_SECRET to a long random string
npm install
npm run seed                       # loads 3 levels of content
npm run dev

# 4) Web app
cd client
npm install
npm run dev                        # open http://localhost:5173
```

Run the backend unit tests with `cd server && npm test`.

## How it works

**Levels and quizzes.** `GET /api/levels` returns every level with `locked | unlocked | completed`.
A level unlocks when the previous one is passed (70%+). Questions are sent **without answers**.
`/check` gives instant feedback per question; `/submit` re-grades everything on the server, so scores
cannot be faked. XP is only awarded for answers beyond your previous best, so retries cannot be farmed.

**Translation grading.** Each Hindi sentence stores every accepted English answer. Answers are
normalised (case, punctuation, contractions) and must match exactly. Fuzzy matching is deliberately
avoided because "He walk" vs "He walks" differs by one letter, which is the exact skill being tested.
Near misses are reported as "Almost".

**Speaking pipeline.** Browser records audio (`MediaRecorder`) or you upload a file, then
Express (multer) passes it to the Whisper service, which returns the transcript with word timings and
confidence. LanguageTool finds grammar issues. `services/analysis.js` computes words per minute,
fillers, long pauses and unclear words, then scores grammar, fluency, pace and length.

**Honest limitation.** This gives solid grammar and fluency feedback. "Unclear words" are an
approximation of pronunciation (words Whisper was unsure about), not true phoneme-level scoring.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Create account / log in, returns JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/levels` | All levels with status |
| GET | `/api/levels/:n` | Questions for an unlocked level |
| POST | `/api/levels/:n/check` | Check one answer |
| POST | `/api/levels/:n/submit` | Grade the level, update XP, streak and progress |
| GET | `/api/speaking/topic` | Random topic |
| POST | `/api/speaking/analyze` | Audio in (`audio` field), report out |
| GET | `/api/speaking/history` | Last 8 attempts |

## Add content

Edit `server/src/data/levels.js` (helpers `mcq()` and `tr()`), then run `npm run seed` again.
Seeding replaces all levels but keeps users and their progress.

## Troubleshooting

- "The speech service is not running": start step 2. "The grammar checker is not running": `docker compose up -d`.
- Microphone blocked: allow it in the browser. Recording needs `localhost` or HTTPS.
- Slow transcription: use a shorter clip, or keep `base.en` (default). `small.en` is more accurate but slower.

## Ideas to extend

More languages (add `tipTe`, `tipTa`...), a leaderboard, spaced-repetition vocabulary, an
"Interview English" track, PWA install, and deployment (Vercel + Render + Atlas; run the Whisper
service locally or on a free Hugging Face Space, checking current limits).
