import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

// Horizontal offsets (in steps) that make the road wind from side to side.
const WIND = [0, 1, 1.7, 1, 0, -1, -1.7, -1];

const starsFor = (score) => (score >= 90 ? 3 : score >= 70 ? 2 : score > 0 ? 1 : 0);

export default function LevelMap() {
  const { user } = useAuth();
  const [levels, setLevels] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.levels().then((d) => setLevels(d.levels)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!levels) return <p className="center-note">Loading your road…</p>;

  const currentNumber = levels.find((l) => l.status === 'unlocked')?.number;

  return (
    <>
      <header className="page-head">
        <h1>Hello, {user.name.split(' ')[0]}</h1>
        <p>Pass a level with 70% or more to unlock the next one.</p>
      </header>

      <ol className="road">
        {levels.map((level, i) => {
          const locked = level.status === 'locked';
          const stars = starsFor(level.bestScore ?? 0);
          const body = (
            <>
              <span className={`stone stone--${level.status} ${level.number === currentNumber ? 'stone--current' : ''}`}>
                {locked ? '🔒' : level.number}
              </span>
              <span className="road__label">
                <strong>{level.emoji} {level.title}</strong>
                <small>{level.description}</small>
                {!locked && (
                  <span className="stars" aria-label={`${stars} of 3 stars`}>
                    {[1, 2, 3].map((n) => <span key={n} className={n <= stars ? 'on' : ''}>★</span>)}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={level.number} style={{ '--wind': WIND[i % WIND.length] }}>
              {locked ? (
                <div className="road__stop road__stop--locked" aria-label={`${level.title}, locked`}>{body}</div>
              ) : (
                <Link className="road__stop" to={`/level/${level.number}`}>{body}</Link>
              )}
            </li>
          );
        })}
      </ol>

      <Link to="/speaking" className="card promo">
        <span className="promo__icon" aria-hidden="true">🎙️</span>
        <span>
          <strong>Speaking challenge</strong>
          <small>Get a random topic, speak for two minutes, and see every correction.</small>
        </span>
      </Link>
    </>
  );
}
