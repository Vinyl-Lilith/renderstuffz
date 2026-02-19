// client/src/components/layout/AppLayout.jsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/logic': 'Logic & Thresholds',
  '/manual': 'Manual Control',
  '/admin': 'Admin Panel',
  '/settings': 'Settings'
};

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Greenhouse';

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(o => !o)} pageTitle={title} />
        {children}
      </div>
    </div>
  );
}
