import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  // Restore the session when the page loads.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // api.js fires this event when the server says the token is no longer valid.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('eq:logout', onLogout);
    return () => window.removeEventListener('eq:logout', onLogout);
  }, []);

  const authenticate = useCallback(async (mode, form) => {
    const data = mode === 'login' ? await api.login(form) : await api.register(form);
    tokenStore.set(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
