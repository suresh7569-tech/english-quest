import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import ScoreRing from '../components/ScoreRing.jsx';

// Keyed by level number so moving to the next level starts with a clean state.
export default function LessonRoute() {
  const { number } = useParams();
  return <Lesson key={number} number={number} />;
}

function Lesson({ number }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [level, setLevel] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null); // option index (mcq) or text (translate)
  const [feedback, setFeedback] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.level(number).then((d) => setLevel(d.level)).catch((e) => setError(e.message));
  }, [number]);

  if (error && !level) {
    return (
      <div className="card center-card">
        <p className="error" role="alert">{error}</p>
        <Link className="btn" to="/">Back to levels</Link>
      </div>
    );
  }
  if (!level) return <p className="center-note">Loading level…</p>;

  const total = level.questions.length;
  const question = level.questions[index];
  const isMcq = question.type === 'mcq';
  const hasAnswer = isMcq ? answer !== null : (answer ?? '').trim().length > 0;

  async function check() {
    if (!hasAnswer || feedback || busy) return;
    setBusy(true);
    setError('');
    try {
      setFeedback(await api.checkAnswer(number, question.id, answer));
      setAnswers((list) => [...list, { questionId: question.id, answer }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (index < total - 1) {
      setIndex(index + 1);
      setAnswer(null);
      setFeedback(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api.submitLevel(number, answers);
      setResult(data);
      setUser(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setIndex(0);
    setAnswer(null);
    setFeedback(null);
    setAnswers([]);
    setResult(null);
  }

  if (result) {
    const stars = result.score >= 90 ? 3 : result.score >= 70 ? 2 : result.score > 0 ? 1 : 0;
    return (
      <div className="card center-card result">
        <ScoreRing value={result.score} label="score" />
        <div className="stars stars--big" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((n) => <span key={n} className={n <= stars ? 'on' : ''}>★</span>)}
        </div>
        <h2>{result.passed ? 'Level complete!' : 'Almost there'}</h2>
        <p>
          You answered {result.correct} of {result.total} correctly
          {result.xpGained > 0 ? ` and earned ${result.xpGained} XP.` : '.'}
          {!result.passed && ` You need ${level.passScore}% to unlock the next level.`}
        </p>
        <div className="actions">
          {result.nextLevel && (
            <button className="btn btn--primary" onClick={() => navigate(`/level/${result.nextLevel}`)}>
              Next level
            </button>
          )}
          <button className="btn" onClick={retry}>Try again</button>
          <Link className="btn btn--ghost" to="/">Back to levels</Link>
        </div>
      </div>
    );
  }

  const progress = ((index + (feedback ? 1 : 0)) / total) * 100;

  return (
    <div className="lesson">
      <div className="lesson__top">
        <Link to="/" className="link-btn" aria-label="Quit level">✕ Quit</Link>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}>
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>
        <span className="lesson__count">{index + 1}/{total}</span>
      </div>

      <div className="card question">
        <p className="question__kind">{isMcq ? 'Choose the right answer' : 'Translate into English'}</p>
        <h2 className={isMcq ? '' : 'question__hindi'} lang={isMcq ? 'en' : 'hi'}>{question.prompt}</h2>

        {isMcq ? (
          <div className="options" role="radiogroup" aria-label="Answer options">
            {question.options.map((option, i) => {
              let state = '';
              if (feedback) state = option === feedback.correctAnswer ? 'is-right' : i === answer ? 'is-wrong' : '';
              else if (i === answer) state = 'is-picked';
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={i === answer}
                  className={`option ${state}`}
                  disabled={Boolean(feedback)}
                  onClick={() => setAnswer(i)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="translate"
            rows={3}
            placeholder="Type your English sentence here"
            value={answer ?? ''}
            disabled={Boolean(feedback)}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                check();
              }
            }}
          />
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      {feedback ? (
        <div className={`sheet ${feedback.correct ? 'sheet--right' : 'sheet--wrong'}`} role="status">
          <div className="sheet__body">
            <h3>{feedback.correct ? 'Correct!' : feedback.almost ? 'Almost. Check the grammar.' : 'Not quite.'}</h3>
            {!feedback.correct && <p>Correct answer: <strong>{feedback.correctAnswer}</strong></p>}
            {feedback.explanation && <p>{feedback.explanation}</p>}
            {feedback.tipHi && <p className="sheet__hi" lang="hi">💡 {feedback.tipHi}</p>}
          </div>
          <button className="btn btn--primary" onClick={next} disabled={busy}>
            {index < total - 1 ? 'Continue' : busy ? 'Saving…' : 'Finish level'}
          </button>
        </div>
      ) : (
        <div className="lesson__footer">
          <button className="btn btn--primary" onClick={check} disabled={!hasAnswer || busy}>
            {busy ? 'Checking…' : 'Check answer'}
          </button>
        </div>
      )}
    </div>
  );
}
