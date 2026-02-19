import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import Layout      from "./components/layout/Layout";
import LoginPage   from "./components/pages/LoginPage";
import HomePage    from "./components/pages/HomePage";
import LogicPage   from "./components/pages/LogicPage";
import ManualPage  from "./components/pages/ManualPage";
import AdminPage   from "./components/pages/AdminPage";
import SettingsPage from "./components/pages/SettingsPage";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"var(--accent-primary)",fontFamily:"var(--font-mono)" }}>⬡ BioCube loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !["admin","head_admin"].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index       element={<HomePage />} />
        <Route path="logic"    element={<LogicPage />} />
        <Route path="manual"   element={<ManualPage />} />
        <Route path="admin"    element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SocketProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
