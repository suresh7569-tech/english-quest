import 'dotenv/config';

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy server/.env.example to server/.env and fill it in.`);
    process.exit(1);
  }
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sttUrl: process.env.STT_URL || 'http://127.0.0.1:8001',
  languageToolUrl: process.env.LANGUAGETOOL_URL || 'http://127.0.0.1:8010',
};
