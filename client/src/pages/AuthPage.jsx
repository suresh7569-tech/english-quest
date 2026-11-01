import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { user, authenticate } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authenticate(mode, isLogin ? { email: form.email, password: form.password } : form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <section className="auth__intro">
        <div className="stone stone--completed stone--hero" aria-hidden="true">E</div>
        <h1>Learn English one milestone at a time.</h1>
        <p>Short quizzes, Hindi-to-English practice, and a two-minute speaking coach that corrects what you say.</p>
      </section>

      <form className="card auth__form" onSubmit={onSubmit}>
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>

        {!isLogin && (
          <label>
            Name
            <input value={form.name} onChange={update('name')} autoComplete="name" required minLength={2} />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={update('email')} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={isLogin ? 1 : 8}
          />
          {!isLogin && <small>At least 8 characters.</small>}
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        <p className="auth__switch">
          {isLogin ? 'New here?' : 'Already have an account?'}{' '}
          <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Log in'}</Link>
        </p>
      </form>
    </div>
  );
}
