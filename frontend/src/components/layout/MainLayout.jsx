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
    <div className="flex h-screen overflow-hidden bg-[#F3F8FF] print:block print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar Navigation */}
      <div className="print:hidden">
        <Sidebar
          onLogout={onLogout}
          adminName={adminName}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Topbar
            title={title}
            adminName={adminName}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
            onLogout={onLogout}
          />
        </div>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
