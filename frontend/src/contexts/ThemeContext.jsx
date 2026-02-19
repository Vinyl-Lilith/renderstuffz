import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children, initialTheme = "dark" }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem("bc_theme") || initialTheme
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bc_theme", theme);
  }, [theme]);

  const setTheme = async (t) => {
    setThemeState(t);
    try { await api.put("/users/theme", { theme: t }); } catch {}
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
