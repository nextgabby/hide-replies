import { useState, useEffect, useCallback } from 'react';
import api, { setAuthToken } from '../api/client';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const { user } = await api.getMe();
      setUser(user);
      setError(null);
    } catch (err) {
      setUser(null);
      if (!err.message.includes('Authentication')) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('auth_token', token);
      setAuthToken(token);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      // Check localStorage for existing token
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        setAuthToken(savedToken);
      }
    }

    fetchUser();
  }, [fetchUser]);

  const login = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${apiUrl}/api/auth/login`;
  };

  const logout = async () => {
    try {
      await api.logout();
      localStorage.removeItem('auth_token');
      setAuthToken(null);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return { user, loading, error, login, logout, refetch: fetchUser };
}

export default useAuth;
