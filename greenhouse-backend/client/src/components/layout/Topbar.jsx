// client/src/components/layout/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function Topbar({ onMenuClick, pageTitle }) {
  const { connected, raspiOnline } = useSocket();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="topbar">
      <button className="btn-ghost" onClick={onMenuClick} style={{ display: 'none', marginRight: 'auto' }}>
        ☰
      </button>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pageTitle}</span>
      </div>

      <div className="status-pill">
        <div className={`status-dot ${connected ? 'online' : ''}`}></div>
        <span style={{ fontSize: '0.78rem' }}>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="status-pill">
        <div className={`status-dot ${raspiOnline ? 'online' : ''}`}></div>
        <span style={{ fontSize: '0.78rem' }}>Pi {raspiOnline ? 'Online' : 'Offline'}</span>
      </div>

      <div ref={panelRef} style={{ position: 'relative' }}>
        <button className="notif-btn" onClick={() => setNotifOpen(o => !o)}>
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {notifOpen && (
          <div className="notif-panel">
            <div className="notif-panel-header">
              <span style={{ fontWeight: 700 }}>Notifications</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear</button>
              </div>
            </div>
            <div className="notif-panel-body">
              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No notifications
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n._id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {!n.read && <div className="notif-unread-dot" style={{ marginTop: 4 }}></div>}
                      <div>
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-msg">{n.message}</div>
                        <div className="notif-item-time">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
