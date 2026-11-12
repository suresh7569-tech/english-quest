import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import LevelMap from './pages/LevelMap.jsx';
import Lesson from './pages/Lesson.jsx';
import Speaking from './pages/Speaking.jsx';

function Shell() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="topbar">
        <div className="topbar__inner">
          <NavLink to="/" className="brand" aria-label="EnglishQuest home">
            <span className="brand__mark" aria-hidden="true" />
            EnglishQuest
          </NavLink>
          <nav className="topbar__nav" aria-label="Main">
            <NavLink to="/" end>Levels</NavLink>
            <NavLink to="/speaking">Speak</NavLink>
          </nav>
          <div className="topbar__stats">
            <span className="pill" title="Days in a row">🔥 {user.streak}</span>
            <span className="pill" title="Experience points">⭐ {user.xp} XP</span>
            <button type="button" className="link-btn" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center-note">Loading…</p>;
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route element={<Protected />}>
            <Route path="/" element={<LevelMap />} />
            <Route path="/level/:number" element={<Lesson />} />
            <Route path="/speaking" element={<Speaking />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
