const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  getMe: () => fetchAPI('/api/auth/me'),
  logout: () => fetchAPI('/api/auth/logout', { method: 'POST' }),

  // Keywords
  getKeywords: () => fetchAPI('/api/keywords'),
  addKeywords: (keywords) => fetchAPI('/api/keywords', {
    method: 'POST',
    body: JSON.stringify({ keywords }),
  }),
  deleteKeyword: (id) => fetchAPI(`/api/keywords/${id}`, { method: 'DELETE' }),

  // Replies
  getHiddenReplies: (page = 1, limit = 20) =>
    fetchAPI(`/api/replies/hidden?page=${page}&limit=${limit}`),
  unhideReply: (id) => fetchAPI(`/api/replies/${id}/unhide`, { method: 'POST' }),
  getStats: () => fetchAPI('/api/replies/stats'),

  // Monitoring
  getMonitoringStatus: () => fetchAPI('/api/monitoring/status'),
  toggleMonitoring: (enabled) => fetchAPI('/api/monitoring/toggle', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  }),
  runScan: () => fetchAPI('/api/monitoring/scan', { method: 'POST' }),
};

export default api;
