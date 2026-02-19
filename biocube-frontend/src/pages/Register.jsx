// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CubeLogo } from '../components/ui/CubeLogo';
import toast from 'react-hot-toast';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(username, email, password);
      toast.success('Welcome to BioCube!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-orb auth-orb-1" style={{ animationDelay: '-2s' }}></div>
      <div className="auth-orb auth-orb-2"></div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-cube-wrap">
            <div className="auth-cube" style={{ color: 'var(--bio-primary)' }}>
              <CubeLogo size={56} />
            </div>
          </div>
          <div className="auth-name">BioCube</div>
          <div className="auth-sub">Create Operator Account</div>
        </div>

        <div className="alert-banner info mb-20">
          <span>ℹ</span>
          <div>The first account registered automatically becomes Head Admin.</div>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Letters, numbers, underscores"
              pattern="^[a-zA-Z0-9_]+$"
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@lab.io"
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
              placeholder="At least 8 characters"
              minLength={8}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-xl"
            style={{ width: '100%', marginBottom: 16 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : '✓ Create Account'}
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Already have access?{' '}
            <Link to="/login" style={{ color: 'var(--bio-primary)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
