// client/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Logic from './pages/Logic';
import Manual from './pages/Manual';
import AdminPanel from './pages/AdminPanel';
import Settings from './pages/Settings';

import './styles/globals.css';

function AppWithProviders() {
  return (
    <SocketProvider>
      <NotificationProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/logic" element={<ProtectedRoute><AppLayout><Logic /></AppLayout></ProtectedRoute>} />
              <Route path="/manual" element={<ProtectedRoute><AppLayout><Manual /></AppLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AppLayout><AdminPanel /></AppLayout></AdminRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '10px'
              }
            }}
          />
        </ThemeProvider>
      </NotificationProvider>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppWithProviders />
    </AuthProvider>
  );
}
