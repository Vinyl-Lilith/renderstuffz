// client/src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function Login() {
  const [view, setView] = useState('login'); // login | forgot
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotLastPw, setForgotLastPw] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authLogin(login, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', {
        username: forgotUsername,
        lastKnownPassword: forgotLastPw,
        message: forgotMessage
      });
      toast.success('Request submitted! An admin will review it.');
      setView('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌿</div>
          <h1>Greenhouse Control</h1>
          <p>Smart Automated Greenhouse System</p>
        </div>

        {params.get('banned') && (
          <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid var(--danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.875rem', color: 'var(--danger)' }}>
            Your account has been banned. Contact an admin.
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input
                className="form-input"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Enter username or email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? '⏳ Logging in...' : '🔑 Log In'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setView('forgot')} style={{ color: 'var(--accent)' }}>
                Forgot password?
              </button>
              <span style={{ margin: '0 8px' }}>·</span>
              <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create account</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Submit a request and an admin will review it. You can optionally enter your last remembered password or write a message to the admin.
            </div>
            <div className="form-group">
              <label className="form-label">Your Username *</label>
              <input
                className="form-input"
                value={forgotUsername}
                onChange={e => setForgotUsername(e.target.value)}
                placeholder="Your exact username"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Remembered Password (optional)</label>
              <input
                type="password"
                className="form-input"
                value={forgotLastPw}
                onChange={e => setForgotLastPw(e.target.value)}
                placeholder="Helps verify your identity"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Message to Admin (optional)</label>
              <textarea
                className="form-input"
                value={forgotMessage}
                onChange={e => setForgotMessage(e.target.value)}
                placeholder="Explain your situation..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? '⏳ Submitting...' : '📩 Submit Request'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={() => setView('login')}>
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
