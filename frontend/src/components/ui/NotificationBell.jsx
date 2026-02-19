import { useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import api from "../../utils/api";
import "./NotificationBell.css";

export default function NotificationBell() {
  const { notifications, markRead } = useSocket();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const handleMarkAll = async () => {
    try { await api.put("/users/notifications/read-all"); } catch {}
    notifications.forEach(n => markRead(n.id));
  };

  const typeClass = { alert:"rose", warning:"amber", success:"green", info:"teal" };

  return (
    <div className="notif-wrap">
      <button className="btn btn-icon notif-btn" onClick={() => setOpen(o => !o)}>
        <span>🔔</span>
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel card">
          <div className="notif-header">
            <span style={{ fontWeight:700 }}>Notifications</span>
            <button className="btn btn-sm" onClick={handleMarkAll}>Mark all read</button>
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty text-muted">All clear ✓</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.read ? "unread" : ""}`} onClick={() => markRead(n.id)}>
                <div className={`notif-dot badge-${typeClass[n.type] || "teal"}`} />
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="notif-sub text-muted">{n.body}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
