import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * Layout utama yang membungkus seluruh halaman admin.
 * Sidebar + Topbar + Main content area.
 */
export default function MainLayout({ children, title, onLogout, adminName }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3F8FF]">
      {/* Sidebar Navigation */}
      <Sidebar
        onLogout={onLogout}
        adminName={adminName}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          title={title}
          adminName={adminName}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onLogout={onLogout}
        />

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
