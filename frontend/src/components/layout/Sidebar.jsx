import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  MapPin,
  MonitorSmartphone,
  QrCode,
  RefreshCw,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { getSidebarData } from '@/lib/api/client';

const menuGroups = [
  {
    label: 'Utama',
    items: [
      {
        name: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        description: 'Ringkasan hari ini',
        badgeKey: 'dashboardIssues',
        badgeTone: 'rose',
      },
      {
        name: 'Karyawan',
        path: '/karyawan',
        icon: Users,
        description: 'Akun dan profil',
        badgeKey: 'employees',
        badgeTone: 'blue',
      },
      {
        name: 'Presensi',
        path: '/presensi',
        icon: CalendarCheck2,
        description: 'Check-in dan geofence',
        badgeKey: 'attendanceIssues',
        badgeTone: 'amber',
      },
    ],
  },
  {
    label: 'Operasional',
    items: [
      {
        name: 'Lokasi Kantor',
        path: '/lokasi-kantor',
        icon: MapPin,
        description: 'Radius geofence',
        badgeKey: 'offices',
        badgeTone: 'emerald',
      },
      {
        name: 'QR Login',
        path: '/qr-login',
        icon: QrCode,
        description: 'Token masuk aplikasi',
        badgeKey: 'qrActive',
        badgeTone: 'blue',
      },
      {
        name: 'Perangkat',
        path: '/devices',
        icon: MonitorSmartphone,
        description: 'Device binding',
        badgeKey: 'devicesInactive',
        badgeTone: 'rose',
      },
      {
        name: 'Worklog',
        path: '/worklog',
        icon: ClipboardList,
        description: 'Aktivitas harian',
        badgeKey: 'worklogsToday',
        badgeTone: 'violet',
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      {
        name: 'Laporan',
        path: '/laporan',
        icon: FileBarChart,
        description: 'Rekap dan ekspor',
        badgeKey: 'reportsReady',
        badgeTone: 'emerald',
      },
      {
        name: 'Pengaturan',
        path: '/pengaturan',
        icon: Settings,
        description: 'Sistem global',
        textBadgeKey: 'settingsMode',
        badgeTone: 'slate',
      },
    ],
  },
];

const fallbackSidebarData = {
  source: 'mock',
  counters: {
    dashboardIssues: 0,
    employees: 0,
    attendanceToday: 0,
    attendanceIssues: 0,
    offices: 0,
    qrActive: 0,
    devicesActive: 0,
    devicesInactive: 0,
    worklogsToday: 0,
    reportsReady: 0,
    settingsMode: 'mock',
  },
};

export default function Sidebar({ onLogout, isMobileOpen = false, onMobileClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarData, setSidebarData] = useState(fallbackSidebarData);
  const [isLoading, setIsLoading] = useState(false);

  const loadSidebar = async () => {
    try {
      setIsLoading(true);
      const data = await getSidebarData();
      setSidebarData(data);
    } catch {
      setSidebarData(fallbackSidebarData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSidebar();
  }, [location.pathname]);

  const counters = sidebarData.counters || fallbackSidebarData.counters;
  const sidebarContent = (
    <>
      <div className="flex h-[74px] items-center justify-between gap-3 border-b border-slate-100 px-5 lg:h-[88px] lg:px-6">
        <button
          type="button"
          onClick={() => {
            onMobileClose?.();
            navigate('/');
          }}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <img
            src="/logo-transparant.png"
            alt="Logo Presensia"
            className="h-11 w-11 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-tight text-slate-950">Presensia</h1>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">Admin Dashboard</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onMobileClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
          aria-label="Tutup menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-wide text-slate-400">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <SidebarLink
                  key={item.path}
                  item={item}
                  counters={counters}
                  onMobileClose={onMobileClose}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSidebar}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-700"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            Sync
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={15} />
            Keluar
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>2026 Presensia</span>
          <span className="inline-flex items-center gap-1">
            <BarChart3 size={13} />
            v1.0.0
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      <button
        type="button"
        aria-label="Tutup menu"
        className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] transition-opacity lg:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[86vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

function SidebarLink({ item, counters, onMobileClose }) {
  const Icon = item.icon;
  const badgeValue = item.textBadgeKey
    ? counters[item.textBadgeKey]
    : counters[item.badgeKey];
  const hasBadge = item.textBadgeKey ? Boolean(badgeValue) : Number(badgeValue || 0) > 0;

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onMobileClose}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
              isActive ? 'bg-white/15 text-white' : 'bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-blue-700'
            }`}
          >
            <Icon size={19} strokeWidth={2.15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.name}</span>
            <span className={`mt-0.5 block truncate text-[11px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
              {item.description}
            </span>
          </span>
          {hasBadge && (
            <span className={badgeClass(item.badgeTone, isActive)}>
              {item.textBadgeKey ? formatModeBadge(String(badgeValue)) : badgeValue}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function badgeClass(tone, isActive) {
  if (isActive) {
    return 'rounded-full bg-white/20 px-2 py-1 text-[11px] font-black text-white';
  }

  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    slate: 'bg-slate-50 text-slate-600 ring-slate-100',
  };

  return `rounded-full px-2 py-1 text-[11px] font-black ring-1 ${tones[tone] || tones.slate}`;
}

function formatModeBadge(value) {
  return value === 'supabase' ? 'DB' : 'Mock';
}
