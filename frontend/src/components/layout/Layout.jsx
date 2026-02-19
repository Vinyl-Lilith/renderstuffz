import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { useState } from "react";
import NotificationBell from "../ui/NotificationBell";
import "./Layout.css";

const NAV = [
  { to: "/",        label: "Overview",   icon: "⬡" },
  { to: "/logic",   label: "Logic",      icon: "⌘" },
  { to: "/manual",  label: "Manual",     icon: "◈" },
  { to: "/settings",label: "Settings",   icon: "◎" },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { connected, piStatus }   = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const nav = useNavigate();

  const handleLogout = async () => { await logout(); nav("/login"); };

  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <button className="collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle sidebar">
            {collapsed ? "▷" : "◁"}
          </button>
          <div className="brand">
            <span className="brand-icon">⬡</span>
            {!collapsed && <span className="brand-name">BioCube</span>}
          </div>

          {!collapsed && (
            <div className="pi-status">
              <span className={`dot ${piStatus?.online ? "dot-green" : "dot-red"}`} />
              <span>{piStatus?.online ? "Pi Online" : "Pi Offline"}</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <span className="nav-icon">◉</span>
              {!collapsed && <span className="nav-label">Admin</span>}
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="user-chip">
              <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <span className="user-name">{user?.username}</span>
                <span className="user-role badge badge-green">{user?.role}</span>
              </div>
            </div>
          )}
          <button className="btn btn-icon logout-btn" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <div className={`ws-badge ${connected ? "ws-connected" : "ws-disconnected"}`}>
              <span className="dot" />
              {connected ? "Live" : "Reconnecting…"}
            </div>
          </div>
          <div className="topbar-right">
            <NotificationBell />
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
