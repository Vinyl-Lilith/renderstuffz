import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(() => { try { return JSON.parse(localStorage.getItem("bc_user")); } catch { return null; } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("bc_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me").then(r => { setUser(r.data.user); persistUser(r.data.user); })
      .catch(() => { localStorage.removeItem("bc_token"); localStorage.removeItem("bc_user"); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const persistUser = u => localStorage.setItem("bc_user", JSON.stringify(u));

  const login = useCallback(async (username, password) => {
    const r = await api.post("/auth/login", { username, password });
    localStorage.setItem("bc_token", r.data.token);
    persistUser(r.data.user);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const r = await api.post("/auth/register", { username, email, password });
    localStorage.setItem("bc_token", r.data.token);
    persistUser(r.data.user);
    setUser(r.data.user);
    return r.data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("bc_token");
    localStorage.removeItem("bc_user");
    setUser(null);
  }, []);

  const updateUser = useCallback(u => { setUser(u); persistUser(u); }, []);

  const isAdmin     = user?.role === "admin" || user?.role === "head_admin";
  const isHeadAdmin = user?.role === "head_admin";

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, updateUser, isAdmin, isHeadAdmin }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
