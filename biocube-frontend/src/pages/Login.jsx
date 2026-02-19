// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { CubeLogo } from '../components/ui/CubeLogo';
import toast from 'react-hot-toast';

export default function Login() {
  const [view, setView] = useState('login'); // 'login' | 'forgot'
  const [loginVal, setLoginVal] = useState('');
  const [password, setPassword] = useState('');
  const [forgotUser, setForgotUser] = useState('');
  const [forgotLastPw, setForgotLastPw] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get('reason');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginVal, password);
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
        username: forgotUser,
        lastKnownPassword: forgotLastPw || undefined,
        message: forgotMsg || undefined
      });
      toast.success('Request submitted — an admin will review it');
      setView('login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1"></div>
      <div className="auth-orb auth-orb-2"></div>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-cube-wrap">
            <div className="auth-cube" style={{ color: 'var(--bio-primary)' }}>
              <CubeLogo size={56} />
            </div>
          </div>
          <div className="auth-name">BioCube</div>
          <div className="auth-sub">Greenhouse Control System</div>
        </div>

        {/* Warning banners */}
        {reason === 'banned' && (
          <div className="alert-banner danger mb-16">
            <span>✗</span>
            Your account has been suspended. Contact an administrator.
          </div>
        )}
        {reason === 'deleted' && (
          <div className="alert-banner danger mb-16">
            <span>✗</span>
            This account no longer exists.
          </div>
        )}

        {view === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username or Email</label>
              <input
                className="form-input"
                value={loginVal}
                onChange={e => setLoginVal(e.target.value)}
                placeholder="operator@greenhouse.io"
                autoComplete="username"
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
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-xl"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex gap-8 items-center">
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                  Authenticating...
                </span>
              ) : '→ Enter System'}
            </button>

            <div className="auth-divider">or</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setView('forgot')}
                style={{ fontSize: '0.8rem', color: 'var(--bio-primary)' }}
              >
                Forgot password?
              </button>
              <Link
                to="/register"
                style={{ fontSize: '0.8rem', color: 'var(--bio-primary)', textDecoration: 'none', fontWeight: 600 }}
              >
                Create account →
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgot}>
            <div className="alert-banner info mb-20">
              <span>ℹ</span>
              <div style={{ lineHeight: 1.5 }}>
                Submit a request. An admin will review it and may reset your password.
                Providing your last known password helps verify your identity.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Your Username *</label>
              <input
                className="form-input"
                value={forgotUser}
                onChange={e => setForgotUser(e.target.value)}
                placeholder="Your exact username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Remembered Password <span className="text-muted">(optional)</span></label>
              <input
                type="password"
                className="form-input"
                value={forgotLastPw}
                onChange={e => setForgotLastPw(e.target.value)}
                placeholder="Helps verify identity"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Message to Admin <span className="text-muted">(optional)</span></label>
              <textarea
                className="form-input"
                value={forgotMsg}
                onChange={e => setForgotMsg(e.target.value)}
                placeholder="Explain your situation..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-xl"
              style={{ width: '100%', marginBottom: 12 }}
              disabled={loading || !forgotUser.trim()}
            >
              {loading ? 'Submitting...' : '↑ Submit Request'}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%' }}
              onClick={() => setView('login')}
            >
              ← Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
