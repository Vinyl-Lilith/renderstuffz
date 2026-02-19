// src/pages/Settings.jsx
import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const THEMES = [
  {
    id: 'dark',
    label: 'Void Dark',
    desc: 'Default biopunk darkness',
    preview: ['#060a0f', '#0c1420', '#00ff96']
  },
  {
    id: 'light',
    label: 'Clean Lab',
    desc: 'Bright clinical interface',
    preview: ['#f0f4f8', '#ffffff', '#00875a']
  },
  {
    id: 'cyber',
    label: 'Cyber Pulse',
    desc: 'Neon violet cyberpunk',
    preview: ['#02000a', '#0a0318', '#c800ff']
  },
  {
    id: 'solar',
    label: 'Solar Core',
    desc: 'Amber radiation warmth',
    preview: ['#0f0800', '#1a1000', '#ffaa00']
  }
];

function ThemePreview({ colors }) {
  return (
    <div className="theme-preview" style={{ background: colors[0], display: 'flex', overflow: 'hidden', gap: 0 }}>
      {/* Sidebar strip */}
      <div style={{ width: '30%', background: colors[1], borderRight: `1px solid ${colors[2]}22`, position: 'relative', padding: '6px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[0.6, 1, 0.5, 0.4].map((o, i) => (
          <div key={i} style={{ height: 3, borderRadius: 2, background: i === 1 ? colors[2] : colors[2], opacity: o, width: i === 1 ? '80%' : '60%' }} />
        ))}
      </div>
      {/* Main strip */}
      <div style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {[1, 0.7, 0.5].map((o, i) => (
            <div key={i} style={{ flex: 1, height: 16, borderRadius: 3, background: colors[1], opacity: o, border: `1px solid ${colors[2]}18` }} />
          ))}
        </div>
        <div style={{ height: 1, background: colors[2], opacity: 0.15 }} />
        <div style={{ height: 6, borderRadius: 2, background: colors[2], opacity: 0.3, width: '70%' }} />
        <div style={{ height: 4, borderRadius: 2, background: colors[2], opacity: 0.1, width: '90%' }} />
      </div>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [newUsername, setNewUsername] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTheme = async (t) => {
    setTheme(t);
    try {
      await api.put('/user/theme', { theme: t });
      updateUser({ theme: t });
      toast.success(`Theme → ${t}`);
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
      toast.success('Username updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 8) { toast.error('Min 8 characters'); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect current password');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div className="page-eyebrow">Configuration</div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and personalize your BioCube experience.</p>
      </div>

      {/* Profile card */}
      <div className="card mb-24 animate-in">
        <div className="card-label">Identity</div>
        <div className="flex gap-16 items-center">
          <div className="user-avatar" style={{ width: 56, height: 56, fontSize: '1.4rem', flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontSize: '1.2rem', fontWeight: 800 }}>{user?.username}</div>
            <div className="text-sm text-secondary">{user?.email}</div>
            <div className="mt-4">
              {user?.role === 'head_admin' ? <span className="badge badge-head">👑 HEAD ADMIN</span>
                : user?.role === 'admin' ? <span className="badge badge-admin">🛡 ADMIN</span>
                : <span className="badge badge-neutral">OPERATOR</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Theme picker */}
      <div className="card mb-24 animate-in">
        <div className="card-label">Interface Theme</div>
        <p className="text-sm text-muted mb-16">
          Your theme is completely personal — changing it doesn't affect any other user.
        </p>
        <div className="theme-grid">
          {THEMES.map(t => (
            <div
              key={t.id}
              className={`theme-option ${theme === t.id ? 'selected' : ''}`}
              onClick={() => handleTheme(t.id)}
              role="button"
              tabIndex={0}
            >
              {theme === t.id && (
                <div className="theme-selected-check">✓</div>
              )}
              <ThemePreview colors={t.preview} />
              <div className="theme-name">{t.label}</div>
              <div className="theme-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Change Username */}
        <div className="card animate-in">
          <div className="card-label">Change Username</div>
          <form onSubmit={handleChangeUsername}>
            <div className="form-group">
              <label className="form-label">Current Username</label>
              <input className="form-input" value={user?.username || ''} disabled style={{ opacity: 0.5 }} />
            </div>
            <div className="form-group">
              <label className="form-label">New Username</label>
              <input
                className="form-input"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="3–30 chars, letters/numbers/_"
                pattern="^[a-zA-Z0-9_]+$"
                minLength={3}
                maxLength={30}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !newUsername.trim()}
            >
              Update Username
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="card animate-in">
          <div className="card-label">Change Password</div>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Your current password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !currentPw || !newPw || !confirmPw}
            >
              Change Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
