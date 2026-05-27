import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  LogOut,
  Menu,
  MonitorSmartphone,
  Search,
  Settings,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';
import { getHeaderData, markHeaderNotificationRead, searchHeader } from '@/lib/api/client';

export default function Topbar({ title, adminName, onMenuClick, onLogout }) {
  const navigate = useNavigate();
  const [headerData, setHeaderData] = useState({
    source: 'mock',
    currentDate: toInputDate(new Date()),
    admin: {
      name: adminName || 'Admin Presensia',
      email: 'admin@presensia.com',
      role: 'Super Admin',
      avatarUrl: null,
    },
    notifications: [],
    unreadCount: 0,
  });
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const [pendingDate, setPendingDate] = useState(toInputDate(new Date()));
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadHeader = useCallback(async (date = selectedDate) => {
    try {
      setIsLoading(true);
      const data = await getHeaderData(date);
      setHeaderData((current) => ({
        ...current,
        ...data,
        admin: {
          ...current.admin,
          ...(data.admin || {}),
          name: data.admin?.name || adminName || current.admin.name,
        },
      }));
      setSelectedDate(data.currentDate || date);
      setPendingDate(data.currentDate || date);
    } catch {
      setHeaderData((current) => ({
        ...current,
        admin: {
          ...current.admin,
          name: adminName || current.admin.name,
        },
      }));
    } finally {
      setIsLoading(false);
    }
  }, [adminName, selectedDate]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      return undefined;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await searchHeader(trimmed);
        setSearchResults(results);
        setIsSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [query]);

  const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);
  const admin = headerData.admin || {};
  const unreadCount = headerData.unreadCount || 0;
  const notifications = headerData.notifications || [];

  const closeFloating = () => {
    setIsDateOpen(false);
    setIsNotifOpen(false);
    setIsProfileOpen(false);
  };

  const openSearchResult = (result) => {
    if (!result?.path) return;
    setQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    navigate(result.path);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault();
      openSearchResult(searchResults[0]);
    }
  };

  const handleNotificationClick = async (item) => {
    setHeaderData((current) => ({
      ...current,
      notifications: current.notifications.map((notif) => (
        notif.id === item.id ? { ...notif, is_read: true } : notif
      )),
      unreadCount: Math.max((current.unreadCount || 0) - (item.is_read ? 0 : 1), 0),
    }));

    try {
      await markHeaderNotificationRead(item.id);
    } catch {
      // Optimistic update is enough for the current mock-first backend flow.
    }

    setIsNotifOpen(false);
    navigate(item.path || '/presensi');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 md:min-h-[64px] md:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
            aria-label="Buka menu"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight text-slate-950 md:text-xl">
              {title}
            </h2>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              {headerData.source === 'supabase' ? 'Terhubung ke database Supabase' : 'Memakai data sementara'}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2 md:gap-3">
          <div className="relative hidden min-[840px]:block">
            <SearchBox
              query={query}
              setQuery={setQuery}
              results={searchResults}
              isOpen={isSearchOpen}
              setIsOpen={setIsSearchOpen}
              onKeyDown={handleSearchKeyDown}
              onOpenResult={openSearchResult}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setIsMobileSearchOpen((value) => !value);
              closeFloating();
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 min-[840px]:hidden"
            aria-label="Cari"
          >
            {isMobileSearchOpen ? <X size={18} /> : <Search size={18} />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsDateOpen((value) => !value);
                setIsNotifOpen(false);
                setIsProfileOpen(false);
              }}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm font-semibold shadow-sm transition md:h-10 md:px-3 ${
                isDateOpen
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <CalendarDays size={17} className={isDateOpen ? 'text-blue-600' : 'text-slate-500'} />
              <span className="hidden sm:inline">{displayDate}</span>
              <ChevronDown size={15} className={`hidden text-slate-400 transition sm:block ${isDateOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isDateOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                <p className="text-sm font-bold text-slate-900">Tanggal Dashboard</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Dipakai untuk memuat ulang notifikasi dan konteks presensi header.
                </p>
                <input
                  type="date"
                  value={pendingDate}
                  onChange={(event) => setPendingDate(event.target.value)}
                  className="mt-4 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsDateOpen(false);
                    loadHeader(pendingDate);
                  }}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
                >
                  {isLoading ? 'Memuat...' : 'Terapkan tanggal'}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((value) => !value);
                setIsDateOpen(false);
                setIsProfileOpen(false);
              }}
              className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition md:h-10 md:w-10 ${
                isNotifOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
              }`}
              aria-label="Notifikasi"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Notifikasi</p>
                    <p className="text-xs text-slate-500">{unreadCount} belum dibaca</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadHeader(selectedDate)}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-700"
                    aria-label="Refresh notifikasi"
                  >
                    <Clock3 size={16} />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length ? notifications.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      onClick={() => handleNotificationClick(item)}
                    />
                  )) : (
                    <div className="px-4 py-6 text-center text-sm font-medium text-slate-500">
                      Tidak ada notifikasi penting.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen((value) => !value);
                setIsDateOpen(false);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-slate-50 md:gap-3"
            >
              <Avatar name={admin.name || adminName || 'Admin'} src={admin.avatarUrl} />
              <div className="hidden text-left xl:block">
                <p className="max-w-36 truncate text-sm font-bold text-slate-900">{admin.name || adminName || 'Admin Presensia'}</p>
                <p className="text-xs font-medium text-blue-600">{admin.role || 'Super Admin'}</p>
              </div>
              <ChevronDown size={15} className={`hidden text-slate-400 transition xl:block ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={admin.name || adminName || 'Admin'} src={admin.avatarUrl} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{admin.name || adminName || 'Admin Presensia'}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{admin.email || 'admin@presensia.com'}</p>
                    </div>
                  </div>
                </div>
                <ProfileAction icon={Settings} label="Pengaturan Global" onClick={() => navigateProfile('/pengaturan')} />
                <ProfileAction icon={MonitorSmartphone} label="Manajemen Perangkat" onClick={() => navigateProfile('/devices')} />
                <ProfileAction icon={LogOut} label="Keluar" danger onClick={onLogout} />
              </div>
            )}
          </div>
        </div>
      </div>

      {isMobileSearchOpen && (
        <div className="border-t border-slate-100 px-4 py-3 min-[840px]:hidden">
          <SearchBox
            query={query}
            setQuery={setQuery}
            results={searchResults}
            isOpen={isSearchOpen}
            setIsOpen={setIsSearchOpen}
            onKeyDown={handleSearchKeyDown}
            onOpenResult={openSearchResult}
            fullWidth
          />
        </div>
      )}
    </header>
  );

  function navigateProfile(path) {
    setIsProfileOpen(false);
    navigate(path);
  }
}

function SearchBox({ query, setQuery, results, isOpen, setIsOpen, onKeyDown, onOpenResult, fullWidth = false }) {
  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'w-[320px] lg:w-[360px]'}`}>
      <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <Search size={18} className="text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Cari karyawan, presensi, lokasi..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {results.length ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id || item.path}-${item.label}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onOpenResult(item)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-blue-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    {item.type === 'employee' ? <UserRound size={16} /> : item.type === 'office' ? <ShieldAlert size={16} /> : <Search size={16} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-900">{item.label}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{item.description}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-center text-sm font-medium text-slate-500">
              Tidak ada hasil ditemukan.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ item, onClick }) {
  const tones = {
    rose: 'bg-rose-50 text-rose-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[item.tone] || tones.blue}`}>
        <ShieldAlert size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="block truncate text-sm font-bold text-slate-800">{item.title}</span>
          {item.is_read && <Check size={14} className="shrink-0 text-emerald-600" />}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
      </span>
    </button>
  );
}

function ProfileAction({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 ${
        danger ? 'text-rose-600' : 'text-slate-700'
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function Avatar({ name, src }) {
  if (src) {
    return <img src={src} alt="" className="h-10 w-10 rounded-full border border-slate-200 object-cover" />;
  }

  const initials = String(name || 'AP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
      {initials || 'AP'}
    </span>
  );
}

function toInputDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function formatDisplayDate(dateValue) {
  const value = dateValue || toInputDate(new Date());
  const date = new Date(`${value}T00:00:00+07:00`);

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
