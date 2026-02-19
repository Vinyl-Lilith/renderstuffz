// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bc_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem('bc_token');
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        const u = res.data.user;
        setUser(u);
        localStorage.setItem('bc_user', JSON.stringify(u));
      } catch {
        localStorage.removeItem('bc_token');
        localStorage.removeItem('bc_user');
        setUser(null);
      } finally { setLoading(false); }
    };
    verify();
  }, []);

  const login = useCallback(async (loginVal, password) => {
    const res = await api.post('/auth/login', { login: loginVal, password });
    const { token, user: u } = res.data;
    localStorage.setItem('bc_token', token);
    localStorage.setItem('bc_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token, user: u } = res.data;
    localStorage.setItem('bc_token', token);
    localStorage.setItem('bc_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('bc_token');
    localStorage.removeItem('bc_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem('bc_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
};
