// client/src/pages/Settings.jsx
import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const THEMES = [
  { id: 'dark', label: '🌙 Dark', description: 'Deep dark theme' },
  { id: 'light', label: '☀️ Light', description: 'Clean light theme' },
  { id: 'green', label: '🌿 Green', description: 'Nature-inspired' },
  { id: 'blue', label: '🌊 Blue', description: 'Ocean blue' }
];

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleThemeChange = async (t) => {
    setTheme(t);
    try {
      await api.put('/user/theme', { theme: t });
      updateUser({ theme: t });
      toast.success(`Theme changed to ${t}`);
    } catch {
      toast.error('Failed to save theme');
    }
  };

  const handleChangeUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setLoading(true);
    try {
      await api.put('/auth/change-username', { newUsername });
      updateUser({ username: newUsername });
      setNewUsername('');
      toast.success('Username changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change username');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🔧 Settings</h1>
        <p>Manage your account and preferences</p>
      </div>
      <div className="page-body">
        {/* Account Info */}
        <div className="card mb-24">
          <div className="card-title">Account Information</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div className="nav-avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.username}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user?.email}</div>
              <div style={{ marginTop: 4 }}>
                {user?.role === 'head_admin' ? <span className="badge badge-head-admin">👑 Head Admin</span>
                  : user?.role === 'admin' ? <span className="badge badge-admin">🛡️ Admin</span>
                  : <span className="badge">👤 User</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="card mb-24">
          <div className="card-title">Interface Theme</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Your theme is personal — changing it won't affect other users.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className="btn"
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  border: theme === t.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: theme === t.id ? 'rgba(74,222,128,0.08)' : 'var(--bg-hover)',
                  gap: 4,
                  height: 'auto'
                }}
              >
                <span style={{ fontWeight: 700 }}>{t.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{t.description}</span>
                {theme === t.id && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600 }}>✓ Active</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2">
          {/* Change Username */}
          <div className="card">
            <div className="card-title">Change Username</div>
            <form onSubmit={handleChangeUsername}>
              <div className="form-group">
                <label className="form-label">Current Username</label>
                <input className="form-input" value={user?.username} disabled />
              </div>
              <div className="form-group">
                <label className="form-label">New Username</label>
                <input
                  className="form-input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="3-30 chars, letters/numbers/_"
                  pattern="^[a-zA-Z0-9_]+$"
                  minLength={3}
                  maxLength={30}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !newUsername.trim()}>
                Update Username
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-title">Change Password</div>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Your current password"
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
                Change Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
