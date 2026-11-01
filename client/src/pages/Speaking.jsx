import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
import { useRecorder } from '../hooks/useRecorder.js';

const MAX_SECONDS = 120;
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function Speaking() {
  const { setUser } = useAuth();
  const rec = useRecorder({ maxSeconds: MAX_SECONDS });
  const [topic, setTopic] = useState('');
  const [history, setHistory] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const loadTopic = () => api.speakingTopic().then((d) => setTopic(d.topic)).catch((e) => setError(e.message));
  const loadHistory = () => api.speakingHistory().then((d) => setHistory(d.sessions)).catch(() => {});

  useEffect(() => {
    loadTopic();
    loadHistory();
  }, []);

  async function analyze() {
    setError('');
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('audio', rec.audio.blob, rec.audio.name);
      form.append('topic', topic);
      const result = await api.analyzeSpeech(form);
      setData(result);
      setUser(result.user);
      loadHistory();
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  }

  function again() {
    rec.reset();
    setData(null);
    setError('');
    loadTopic();
  }

  if (data) return <Report data={data} onAgain={again} />;

  const recording = rec.status === 'recording';
  const ready = rec.status === 'ready';
  const shownError = error || rec.error;

  return (
    <>
      <header className="page-head">
        <h1>Speaking challenge</h1>
        <p>Speak for two minutes. We transcribe it, check the grammar and score your fluency.</p>
      </header>

      <section className="card speak">
        <p className="question__kind">Your topic</p>
        <h2 className="speak__topic">{topic || 'Finding a topic…'}</h2>

        {recording && (
          <>
            <p className="speak__clock" aria-live="off">{clock(rec.seconds)}</p>
            <div className="progress"><div className="progress__bar" style={{ width: `${(rec.seconds / MAX_SECONDS) * 100}%` }} /></div>
          </>
        )}

        {ready && rec.audio && <audio className="speak__audio" controls src={rec.audio.url} />}
        {analyzing && <p className="speak__wait">Listening to your speech. This can take up to a minute.</p>}
        {shownError && <p className="error" role="alert">{shownError}</p>}

        <div className="actions">
          {rec.status === 'idle' && (
            <>
              <button className="btn btn--primary" onClick={rec.start} disabled={!topic}>Start speaking</button>
              <label className="btn btn--ghost file-btn">
                Upload audio
                <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files[0] && rec.useFile(e.target.files[0])} />
              </label>
              <button className="link-btn" onClick={loadTopic}>New topic</button>
            </>
          )}
          {recording && <button className="btn btn--danger" onClick={rec.stop}>Stop recording</button>}
          {ready && (
            <>
              <button className="btn btn--primary" onClick={analyze} disabled={analyzing}>
                {analyzing ? 'Analysing…' : 'Get my feedback'}
              </button>
              <button className="btn btn--ghost" onClick={rec.reset} disabled={analyzing}>Record again</button>
            </>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="card">
          <h3>Recent attempts</h3>
          <ul className="history">
            {history.map((s) => (
              <li key={s._id}>
                <span className="history__score">{s.score}</span>
                <span>{s.topic}<small>{new Date(s.createdAt).toLocaleDateString()} · {s.durationSec}s</small></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Wraps each grammar issue in <mark> so the learner sees exactly where the mistake was. */
function highlight(text, issues) {
  const parts = [];
  let cursor = 0;
  [...issues].sort((a, b) => a.offset - b.offset).forEach((issue, i) => {
    if (issue.offset < cursor) return; // overlapping issue
    parts.push(text.slice(cursor, issue.offset));
    parts.push(<mark key={i} title={issue.message}>{text.slice(issue.offset, issue.offset + issue.length)}</mark>);
    cursor = issue.offset + issue.length;
  });
  parts.push(text.slice(cursor));
  return parts;
}

function Report({ data, onAgain }) {
  const { report, xpGained } = data;
  const { scores, metrics, issues, tips } = report;
  const bars = [
    ['Grammar', scores.grammar],
    ['Fluency', scores.fluency],
    ['Pace', scores.pace],
    ['Length', scores.length],
  ];
  const stats = [
    [`${metrics.wpm}`, 'words per minute', 'Aim for 110 to 160'],
    [`${metrics.fillerCount}`, 'filler words', '“um”, “uh”, “you know”'],
    [`${metrics.longPauses}`, 'long pauses', 'Gaps over 1.2 seconds'],
    [`${metrics.uniqueWords}`, 'different words', `Out of ${metrics.wordCount} spoken`],
  ];

  return (
    <>
      <header className="page-head">
        <h1>Your feedback</h1>
        <p>{report.topic}</p>
      </header>

      <section className="card report__score">
        <ScoreRing value={scores.overall} label="overall" />
        <div className="bars">
          {bars.map(([name, value]) => (
            <div key={name} className="bar">
              <span>{name}</span>
              <div className="progress"><div className="progress__bar" style={{ width: `${value}%` }} /></div>
              <strong>{value}</strong>
            </div>
          ))}
          <p className="bars__xp">+{xpGained} XP earned</p>
        </div>
      </section>

      <section className="stat-grid">
        {stats.map(([value, label, hint]) => (
          <div key={label} className="card stat">
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{hint}</small>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>What you said</h3>
        <p className="transcript">{highlight(report.transcript, issues)}</p>
        <h3>A polished version</h3>
        <p className="transcript transcript--fixed">{report.correctedText}</p>
      </section>

      {issues.length > 0 && (
        <section className="card">
          <h3>Corrections ({issues.length})</h3>
          <ul className="issues">
            {issues.map((issue, i) => (
              <li key={i}>
                <p>
                  <span className="issues__wrong">{issue.wrong}</span>
                  {issue.suggestion && <> becomes <strong>{issue.suggestion}</strong></>}
                </p>
                <small>{issue.message}</small>
              </li>
            ))}
          </ul>
        </section>
      )}

      {metrics.unclearWords.length > 0 && (
        <section className="card">
          <h3>Words to practise</h3>
          <p className="muted">These words were hard to recognise, which can mean the pronunciation was unclear.</p>
          <p className="chips">{metrics.unclearWords.map((w) => <span key={w}>{w}</span>)}</p>
        </section>
      )}

      <section className="card">
        <h3>Next steps</h3>
        <ul className="tips">{tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </section>

      <div className="actions">
        <button className="btn btn--primary" onClick={onAgain}>Try another topic</button>
      </div>
    </>
  );
}
