// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { CubeLogo } from '../ui/CubeLogo';

const NAV = [
  { path: '/', icon: '◈', label: 'Dashboard', exact: true },
  { path: '/logic', icon: '◎', label: 'Logic' },
  { path: '/manual', icon: '◉', label: 'Manual Control' },
  { path: '/settings', icon: '◌', label: 'Settings' }
];

function roleLabel(role) {
  if (role === 'head_admin') return 'HEAD ADMIN';
  if (role === 'admin') return 'ADMIN';
  return 'OPERATOR';
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const { raspiOnline, connected } = useSocket();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-cube" style={{ color: 'var(--bio-primary)' }}>
            <CubeLogo size={40} />
          </div>
          <div className="logo-text">
            <span className="logo-name">BioCube</span>
            <span className="logo-tagline">Greenhouse OS v1.0</span>
          </div>
        </div>
      </div>

      {/* System status row */}
      <div className="sidebar-status">
        <div className={`sys-status-dot ${connected ? '' : 'offline'}`}></div>
        <span className="sys-status-text">
          {connected ? `SYS ONLINE` : 'SYS OFFLINE'}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <div className={`sys-status-dot ${raspiOnline ? '' : 'offline'}`}
            style={{ width: 5, height: 5 }}
          ></div>
        </span>
        <span className="sys-status-text">PI</span>
      </div>

      {/* Navigation */}
      <div className="nav-items">
        <div className="nav-section-label">Navigation</div>

        {NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon" style={{ fontFamily: 'monospace' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {(user?.role === 'admin' || user?.role === 'head_admin') && (
          <>
            <div className="nav-section-label" style={{ marginTop: 8 }}>Administration</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">⬡</span>
              Admin Panel
            </NavLink>
          </>
        )}

        {/* Notifications quick link */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Alerts</div>
        <div style={{ padding: '8px 24px' }}>
          <div style={{
            background: 'var(--border-dim)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}>
            <div className="flex-between">
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Unread Alerts
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--accent-red)',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontFamily: 'DM Mono',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: 100
                }}>{unreadCount}</span>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
              {unreadCount === 0 ? '● ALL CLEAR' : `● ${unreadCount} PENDING`}
            </div>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">
            {user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{roleLabel(user?.role)}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}
