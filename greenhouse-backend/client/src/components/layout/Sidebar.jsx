// client/src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Dashboard', exact: true },
  { path: '/logic', icon: '⚙️', label: 'Logic / Thresholds' },
  { path: '/manual', icon: '🎛️', label: 'Manual Control' },
  { path: '/settings', icon: '🔧', label: 'Settings' }
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const { raspiOnline } = useSocket();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      <div className="nav-logo">
        <span className="nav-logo-icon">🌿</span>
        <span className="nav-logo-text">Greenhouse</span>
      </div>

      <div className="nav-items">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        {(user?.role === 'admin' || user?.role === 'head_admin') && (
          <NavLink
            to="/admin"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">👑</span>
            Admin Panel
          </NavLink>
        )}

        <div style={{ padding: '16px 20px 8px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          System Status
        </div>

        <div style={{ padding: '4px 20px' }}>
          <div className="status-pill" style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', padding: 0 }}>
            <div className={`status-dot ${raspiOnline ? 'online' : ''}`}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Raspberry Pi: {raspiOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="nav-footer">
        <div className="nav-user">
          <div className="nav-avatar">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="nav-username" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div className="nav-role">
              {user?.role === 'head_admin' ? '👑 Head Admin' : user?.role === 'admin' ? '🛡️ Admin' : '👤 User'}
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} title="Logout" style={{ padding: '4px 8px' }}>
            🚪
          </button>
        </div>
      </div>
    </nav>
  );
}
