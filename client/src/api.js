const TOKEN_KEY = 'eq_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('eq:logout')); // AuthContext listens and signs the user out
    }
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  me: () => request('/auth/me'),

  levels: () => request('/levels'),
  level: (n) => request(`/levels/${n}`),
  checkAnswer: (n, questionId, answer) => request(`/levels/${n}/check`, { method: 'POST', body: { questionId, answer } }),
  submitLevel: (n, answers) => request(`/levels/${n}/submit`, { method: 'POST', body: { answers } }),

  speakingTopic: () => request('/speaking/topic'),
  speakingHistory: () => request('/speaking/history'),
  analyzeSpeech: (form) => request('/speaking/analyze', { method: 'POST', form }),
};
