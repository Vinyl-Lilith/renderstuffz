// src/components/layout/AppLayout.jsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/logic': 'Logic & Thresholds',
  '/manual': 'Manual Control',
  '/admin': 'Admin Panel',
  '/settings': 'Settings',
};

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  const title = PAGE_TITLES[pathname] || 'BioCube';

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 150, backdropFilter: 'blur(4px)'
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="main-content">
        <Topbar
          title={title}
          onMenuToggle={() => setMobileOpen(o => !o)}
        />
        {children}
      </div>
    </div>
  );
}
