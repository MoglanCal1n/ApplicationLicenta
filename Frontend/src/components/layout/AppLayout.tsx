import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Top Navigation */}
      <Navbar />

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main
        className="pt-[var(--navbar-height)] transition-all duration-300 ease-in-out"
        style={{
          marginLeft: sidebarCollapsed
            ? 'var(--sidebar-collapsed-width)'
            : 'var(--sidebar-width)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
