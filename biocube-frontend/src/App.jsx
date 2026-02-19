// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
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

function InnerApp() {
  return (
    <SocketProvider>
      <NotificationProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              {/* Protected */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout><Dashboard /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/logic" element={
                <ProtectedRoute>
                  <AppLayout><Logic /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/manual" element={
                <ProtectedRoute>
                  <AppLayout><Manual /></AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout><Settings /></AppLayout>
                </ProtectedRoute>
              } />

              {/* Admin only */}
              <Route path="/admin" element={
                <AdminRoute>
                  <AppLayout><AdminPanel /></AppLayout>
                </AdminRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-med)',
                borderRadius: '10px',
                fontFamily: 'Outfit, sans-serif',
                fontSize: '0.83rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              },
              success: {
                iconTheme: { primary: 'var(--bio-primary)', secondary: '#000' }
              },
              error: {
                iconTheme: { primary: 'var(--accent-red)', secondary: '#fff' }
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
      <InnerApp />
    </AuthProvider>
  );
}
