// src/components/layout/Topbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

export default function Topbar({ title, onMenuToggle }) {
  const { connected, raspiOnline } = useSocket();
  const { notifications, unreadCount, markRead, clearAll } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openPanel = () => {
    setPanelOpen(o => !o);
  };

  return (
    <header className="topbar">
      <button
        className="btn btn-ghost btn-icon"
        onClick={onMenuToggle}
        style={{ display: 'none' }}
        aria-label="Menu"
      >
        ☰
      </button>

      <div className="topbar-title">{title}</div>

      <div className="topbar-pills">
        <div className={`status-pill ${connected ? 'online' : 'offline'}`}>
          <div className="pill-dot"></div>
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>

        <div className={`status-pill ${raspiOnline ? 'online' : 'offline'}`}>
          <div className="pill-dot"></div>
          PI {raspiOnline ? 'ONLINE' : 'OFFLINE'}
        </div>

        <div ref={panelRef} style={{ position: 'relative' }}>
          <button className="notif-trigger" onClick={openPanel} aria-label="Notifications">
            <span>🔔</span>
            {unreadCount > 0 && (
              <span className="notif-count">{unreadCount > 99 ? '99' : unreadCount}</span>
            )}
          </button>

          {panelOpen && (
            <div className="notif-panel">
              <div className="notif-panel-head">
                <span className="notif-panel-title">System Alerts</span>
                <div className="flex gap-8">
                  {unreadCount > 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => markRead()}
                      style={{ fontSize: '0.72rem' }}
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={clearAll}
                    style={{ fontSize: '0.72rem' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="notif-body">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✓</div>
                    All systems nominal
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n._id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                      onClick={() => !n.read && markRead([n._id])}
                    >
                      <div className="notif-item-title">{n.title}</div>
                      <div className="notif-item-msg">{n.message}</div>
                      <div className="notif-item-time">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
