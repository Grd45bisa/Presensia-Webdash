import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  EllipsisVertical,
  FileText,
  LocateFixed,
  MapPin,
  MoreVertical,
  QrCode,
  RefreshCw,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { getDashboardData } from '@/lib/api/client';

const emptyDashboardData = {
  source: 'supabase',
  pagination: {
    from: 0,
    to: 0,
    total: 0,
    currentPage: 1,
    lastPage: 1,
  },
  summaryCards: [],
  trendData: [],
  latestAttendance: [],
  tableRows: [],
  primaryOffice: null,
};

const typeLabel = {
  office: 'Kantor',
  remote: 'Remote',
  field: 'Lapangan',
};

const iconMap = {
  users: Users,
  userRoundCheck: UserRoundCheck,
  clock: Clock3,
  mapPin: MapPin,
  locateFixed: LocateFixed,
};

const cardRoutes = {
  'Total Karyawan': '/karyawan',
  'Hadir Hari Ini': '/presensi',
  'Belum Presensi': '/presensi',
  'Di Luar Geofence': '/presensi',
  'Indikasi Fake GPS': '/presensi',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(emptyDashboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage('');

    try {
      const data = await getDashboardData('supabase');

      setDashboardData(data);
      setErrorMessage('');
      setPage(1);
    } catch (err) {
      setDashboardData(emptyDashboardData);
      setErrorMessage(err.message);
      setPage(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rows = dashboardData.tableRows || [];
  const rowsPerPage = 5;
  const totalPages = Math.max(Math.ceil(rows.length / rowsPerPage), 1);
  const paginatedRows = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const pageFrom = rows.length ? (page - 1) * rowsPerPage + 1 : 0;
  const pageTo = Math.min(page * rowsPerPage, rows.length);

  const summaryMap = useMemo(() => {
    return Object.fromEntries((dashboardData.summaryCards || []).map((card) => [card.title, card]));
  }, [dashboardData.summaryCards]);

  const reviewItems = useMemo(() => {
    return [
      {
        title: 'Belum check-out',
        value: rows.filter((row) => row.status !== 'Selesai').length,
        detail: 'Perlu dipantau sebelum jam pulang',
        tone: 'blue',
      },
      {
        title: 'Luar geofence',
        value: rows.filter((row) => row.geofence === 'outside').length || parseNumber(summaryMap['Di Luar Geofence']?.value),
        detail: 'Buka menu Presensi untuk validasi lokasi',
        tone: 'rose',
      },
      {
        title: 'Fake GPS',
        value: parseNumber(summaryMap['Indikasi Fake GPS']?.value),
        detail: 'Cek bukti device dan lokasi',
        tone: 'red',
      },
    ];
  }, [rows, summaryMap]);

  const exportRows = useCallback(() => {
    downloadCsv(
      'ringkasan-presensi-dashboard.csv',
      [
        ['Nama', 'Tipe User', 'Check-in', 'Check-out', 'Jam Kerja', 'Status Telat', 'Lokasi', 'Geofence', 'Skor Wajah', 'Status'],
        ...rows.map((row) => [
          row.name,
          typeLabel[row.type] || row.type,
          row.checkIn,
          row.checkOut,
          row.workDuration || '-',
          row.lateStatus || 'Tepat waktu',
          row.location,
          row.geofence,
          row.score,
          row.status,
        ]),
      ],
    );
    setStatusMessage('Ringkasan presensi berhasil diekspor.');
  }, [rows]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                  Dashboard Presensia
                </p>
                <h2 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  Kontrol presensi hari ini
                </h2>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                  Pantau karyawan, geofence, QR login, dan laporan dari satu halaman yang saling terhubung.
                </p>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 xl:hidden"
              >
                <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 xl:border-l xl:border-t-0">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Aksi cepat</p>
            <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
              <ActionButton onClick={() => navigate('/laporan')} icon={FileText}>
                Laporan
              </ActionButton>
              <ActionButton onClick={() => navigate('/qr-login')} icon={QrCode}>
                QR Login
              </ActionButton>
              <ActionButton onClick={loadDashboard} icon={RefreshCw} loading={isLoading} hideOnSmall>
                Refresh
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:gap-3 sm:p-5 xl:grid-cols-3">
          <SourcePill
            icon={CalendarDays}
            label="Periode"
            value="Mei 2026"
            detail="Data presensi aktif"
            tone="blue"
          />
          <SourcePill
            icon={Building2}
            label="Lokasi utama"
            value={dashboardData.primaryOffice?.name || 'Belum ada lokasi'}
            detail={dashboardData.primaryOffice ? 'Geofence aktif' : 'Tambahkan lokasi kantor'}
            tone="emerald"
            onClick={() => navigate('/lokasi-kantor')}
          />
          <SourcePill
            icon={Users}
            label="Akun aktif"
            value={`${summaryMap['Total Karyawan']?.value || 0} karyawan`}
            detail="Klik card untuk buka detail"
            tone="violet"
            onClick={() => navigate('/karyawan')}
          />
        </div>
      </section>

      {(isLoading || errorMessage || statusMessage) && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {isLoading
            ? 'Mengambil data dashboard dari backend...'
            : errorMessage
              ? `Gagal mengambil data Supabase. ${errorMessage}`
              : statusMessage || 'Data dashboard diperbarui.'}
        </div>
      )}

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-5 2xl:gap-4">
        {(dashboardData.summaryCards || []).map((card, index) => (
          <MetricCard
            key={card.title}
            {...card}
            isLastMobileCard={index === dashboardData.summaryCards.length - 1}
            onClick={() => navigate(cardRoutes[card.title] || '/presensi')}
          />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <TrendCard
          trendData={dashboardData.trendData || []}
          onRefresh={loadDashboard}
          onExport={(chartRows) => {
            downloadCsv('tren-presensi-dashboard.csv', [
              ['Tanggal', 'Hadir', 'Belum Presensi', 'Tingkat Kehadiran'],
              ...chartRows.map((row) => [row.date, row.hadir, row.belumPresensi, `${row.tingkatKehadiran}%`]),
            ]);
            setStatusMessage('Grafik presensi berhasil diekspor.');
          }}
          onDetail={() => navigate('/laporan')}
        />
        <ReviewPanel items={reviewItems} onOpenAttendance={() => navigate('/presensi')} />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <AttendanceTable
          tableRows={paginatedRows}
          allRows={rows}
          page={page}
          totalPages={totalPages}
          pageFrom={pageFrom}
          pageTo={pageTo}
          onPageChange={setPage}
          onExport={exportRows}
          onDetail={() => navigate('/presensi')}
        />
        <LatestCard
          latestAttendance={dashboardData.latestAttendance || []}
          onViewAll={() => navigate('/presensi')}
        />
      </section>
    </div>
  );
}

function ActionButton({ children, icon: Icon, onClick, loading = false, hideOnSmall = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white hover:text-blue-700 sm:px-3 sm:text-sm xl:justify-start ${
        hideOnSmall ? 'hidden xl:inline-flex' : ''
      }`}
    >
      <Icon size={17} className={`shrink-0 ${loading ? 'animate-spin' : ''}`} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function SourcePill({ icon: Icon, label, value, detail, tone = 'blue', onClick }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-sm transition sm:gap-3 sm:p-3 ${
        onClick ? 'hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md' : ''
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:h-10 sm:w-10 ${tones[tone] || tones.blue}`}>
        <Icon size={16} className="sm:hidden" />
        <Icon size={18} className="hidden sm:block" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black uppercase tracking-wide text-slate-400 sm:text-[11px]">
          {label}
        </div>
        <p className="mt-0.5 truncate text-[13px] font-black leading-5 text-slate-950 sm:mt-1 sm:text-sm">{value}</p>
        <p className="mt-0.5 hidden truncate text-xs font-medium text-slate-500 sm:block">{detail}</p>
      </div>
    </Component>
  );
}

function MetricCard({ title, value, detail, color, icon, isLastMobileCard, onClick }) {
  const Icon = typeof icon === 'string' ? iconMap[icon] || Users : icon;
  const c = metricPalette[color] || metricPalette.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 sm:p-4 xl:min-h-[142px] xl:p-5 ${
        isLastMobileCard ? 'col-span-2 lg:col-span-1' : ''
      }`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 hidden h-20 bg-gradient-to-b ${c.wash} to-transparent opacity-80 xl:block`} />

      <div
        className={`relative flex justify-between gap-3 xl:hidden ${
          isLastMobileCard
            ? 'min-h-0 flex-row items-center'
            : 'min-h-[116px] flex-col min-[520px]:min-h-0 min-[520px]:flex-row min-[520px]:items-center'
        }`}
      >
        <div className="flex min-w-0 items-start gap-2.5 min-[520px]:items-center">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${c.box} min-[520px]:h-11 min-[520px]:w-11`}>
            <Icon size={21} strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-800 sm:text-sm">
              {title}
            </p>
            <div className={`mt-1 min-w-0 items-center gap-2 ${isLastMobileCard ? 'flex' : 'hidden min-[520px]:flex'}`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
              <span className={`truncate text-xs font-semibold ${c.detail}`}>{detail}</span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className={`text-3xl font-bold leading-none tracking-tight sm:text-[32px] ${c.text}`}>
            {value}
          </p>
          <div className={`mt-2 min-w-0 items-center gap-2 ${isLastMobileCard ? 'hidden' : 'flex min-[520px]:hidden'}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
            <span className={`truncate text-[11px] font-semibold sm:text-xs ${c.detail}`}>
              {detail}
            </span>
          </div>
        </div>
      </div>

      <div className="relative hidden h-full flex-col justify-between gap-5 xl:flex">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${c.box}`}>
            <Icon size={28} strokeWidth={2.15} />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-sm font-semibold leading-5 text-slate-600">{title}</p>
            <p className={`mt-1 text-[34px] font-bold leading-none tracking-tight ${c.text}`}>
              {value}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} />
            <span className={`truncate text-xs font-bold sm:text-[13px] ${c.detail}`}>
              {detail}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-100">
            Buka <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
}

function TrendCard({ trendData, onRefresh, onExport, onDetail }) {
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [period, setPeriod] = useState('Bulanan');
  const normalizedData = useMemo(() => normalizeTrendData(trendData), [trendData]);
  const chartData = useMemo(() => buildTrendByPeriod(normalizedData, period), [normalizedData, period]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tren Presensi - Mei 2026</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Hover titik atau batang grafik untuk melihat data harian.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPeriodOpen((value) => !value);
                setIsActionOpen(false);
              }}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                isPeriodOpen
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              {period}
              <ChevronDown size={15} className={isPeriodOpen ? 'rotate-180 transition' : 'transition'} />
            </button>

            {isPeriodOpen && (
              <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                {['Harian', 'Mingguan', 'Bulanan'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setPeriod(option);
                      setIsPeriodOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-blue-50 hover:text-blue-700 ${
                      period === option ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsActionOpen((value) => !value);
                setIsPeriodOpen(false);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                isActionOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              aria-label="Aksi grafik"
            >
              <MoreVertical size={20} />
            </button>

            {isActionOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                <MenuAction
                  label="Refresh data"
                  onClick={() => {
                    setIsActionOpen(false);
                    onRefresh();
                  }}
                />
                <MenuAction
                  label="Export grafik"
                  onClick={() => {
                    setIsActionOpen(false);
                    onExport(chartData);
                  }}
                />
                <MenuAction
                  label="Lihat laporan"
                  onClick={() => {
                    setIsActionOpen(false);
                    onDetail();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium">
        <Legend color="bg-blue-500" label="Hadir" />
        <Legend color="bg-slate-200" label="Belum Presensi" />
        <div className="flex items-center gap-2 text-slate-600">
          <span className="h-0.5 w-5 bg-emerald-500" />
          Tingkat Kehadiran (%)
        </div>
      </div>

      <div className="h-[290px] sm:h-[330px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              interval={period === 'Bulanan' ? 1 : 0}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              yAxisId="count"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              width={44}
            />
            <YAxis
              yAxisId="percent"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
              width={44}
            />
            <Tooltip cursor={{ fill: '#EFF6FF' }} content={<TrendTooltip />} />
            <Bar
              yAxisId="count"
              dataKey="belumPresensi"
              fill="#E2E8F0"
              radius={[6, 6, 0, 0]}
              maxBarSize={14}
              name="Belum Presensi"
            />
            <Bar
              yAxisId="count"
              dataKey="hadir"
              fill="#3B82F6"
              radius={[6, 6, 0, 0]}
              maxBarSize={14}
              name="Hadir"
            />
            <Line
              yAxisId="percent"
              type="monotone"
              dataKey="tingkatKehadiran"
              stroke="#16A34A"
              strokeWidth={3}
              dot={{ r: 4, fill: '#FFFFFF', stroke: '#16A34A', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#16A34A', stroke: '#FFFFFF', strokeWidth: 2 }}
              name="Tingkat Kehadiran"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ReviewPanel({ items, onOpenAttendance }) {
  const toneClass = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Perlu Ditinjau</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Anomali yang perlu admin cek hari ini.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAttendance}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          Buka <ArrowRight size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={onOpenAttendance}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
          >
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{item.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs font-medium text-slate-500">{item.detail}</p>
            </div>
            <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-lg font-black ${toneClass[item.tone]}`}>
              {item.value}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function LatestCard({ latestAttendance, onViewAll }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Presensi Terbaru</h3>
        <button type="button" onClick={onViewAll} className="text-sm font-bold text-blue-600 hover:text-blue-700">
          Lihat semua
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {latestAttendance.map((item, index) => (
          <button
            key={`${item.name}-${item.time}`}
            type="button"
            onClick={onViewAll}
            className="flex w-full items-center gap-3 py-3 text-left first:pt-0 hover:bg-blue-50/40 sm:gap-4"
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`}
              alt=""
              className="h-11 w-11 rounded-lg border border-slate-200 object-cover sm:h-12 sm:w-12"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
              <p className="truncate text-xs font-medium text-slate-500">{item.role}</p>
            </div>
            <div className="hidden w-16 text-sm font-semibold text-slate-800 min-[420px]:block">
              <p>{item.time}</p>
              <p className="text-xs font-medium text-slate-500">Skor {item.score}</p>
            </div>
            <Badge type={index === 4 || item.status === 'Lapangan' ? 'field' : 'hadir'}>{item.status}</Badge>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700"
      >
        Lihat semua presensi terbaru
        <ChevronRight size={16} />
      </button>
    </section>
  );
}

function AttendanceTable({
  tableRows,
  allRows,
  page,
  totalPages,
  pageFrom,
  pageTo,
  onPageChange,
  onExport,
  onDetail,
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Ringkasan Presensi Hari Ini</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{allRows.length} data tersedia di dashboard.</p>
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
            <tr>
              <th className="px-5 py-3">Nama</th>
              <th className="px-5 py-3">Tipe User</th>
              <th className="px-5 py-3">Check-in</th>
              <th className="px-5 py-3">Check-out</th>
              <th className="px-5 py-3">Jam Kerja</th>
              <th className="px-5 py-3">Lokasi</th>
              <th className="px-5 py-3">Geofence</th>
              <th className="px-5 py-3">Skor Wajah</th>
              <th className="px-5 py-3">Status</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tableRows.map((row) => (
              <tr key={row.name} className="hover:bg-blue-50/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`}
                      alt=""
                      className="h-8 w-8 rounded-lg border border-slate-200 object-cover"
                    />
                    <span className="font-bold text-slate-800">{row.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge type={row.type}>{typeLabel[row.type]}</Badge>
                </td>
                <td className="px-5 py-3 font-medium text-slate-700">{row.checkIn}</td>
                <td className="px-5 py-3 font-medium text-slate-700">{row.checkOut}</td>
                <td className="px-5 py-3">
                  <p className="font-bold text-slate-700">{row.workDuration || '-'}</p>
                  <p className={`mt-0.5 text-[10px] font-bold uppercase ${
                    String(row.lateStatus || '').startsWith('Terlambat') ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {row.lateStatus || 'Tepat waktu'}
                  </p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 font-medium text-slate-700">
                    <MapPin size={17} className={row.type === 'remote' ? 'text-blue-500' : 'text-blue-600'} />
                    {row.location}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <Badge type={row.geofence === 'inside' ? 'hadir' : 'luar_geofence'}>
                    {row.geofence === 'inside' ? 'Inside' : 'Outside'}
                  </Badge>
                </td>
                <td className="px-5 py-3 font-medium text-slate-700">{row.score}</td>
                <td className="px-5 py-3">
                  <Badge type={row.status === 'Selesai' ? 'hadir' : 'used'}>{row.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={onDetail}
                    className="text-slate-500 hover:text-slate-800"
                    aria-label={`Buka detail ${row.name}`}
                  >
                    <EllipsisVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 p-4 xl:hidden">
        {tableRows.map((row) => (
          <button
            key={row.name}
            type="button"
            onClick={onDetail}
            className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
          >
            <div className="flex items-start gap-3">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`}
                alt=""
                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{row.name}</p>
                  <Badge type={row.type}>{typeLabel[row.type]}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {row.checkIn} - {row.checkOut} · {row.location}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Jam kerja {row.workDuration || '-'} · {row.lateStatus || 'Tepat waktu'}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge type={row.geofence === 'inside' ? 'hadir' : 'luar_geofence'}>
                {row.geofence === 'inside' ? 'Inside' : 'Outside'}
              </Badge>
              <Badge type={row.status === 'Selesai' ? 'hadir' : 'used'}>{row.status}</Badge>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Skor {row.score}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm font-medium text-slate-600 md:flex-row md:items-center md:justify-between sm:px-5">
        <p>Menampilkan {pageFrom} - {pageTo} dari {allRows.length} data</p>
        <div className="flex flex-wrap items-center gap-2">
          <PageButton disabled={page <= 1} onClick={() => onPageChange(Math.max(page - 1, 1))}>
            <ChevronLeft size={18} />
          </PageButton>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <PageButton
              key={pageNumber}
              active={pageNumber === page}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </PageButton>
          ))}
          <PageButton disabled={page >= totalPages} onClick={() => onPageChange(Math.min(page + 1, totalPages))}>
            <ChevronRight size={18} />
          </PageButton>
        </div>
      </div>
    </section>
  );
}

function PageButton({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-bold transition disabled:cursor-not-allowed disabled:text-slate-300 ${
        active ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function MenuAction({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
    >
      {label}
    </button>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-slate-600">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      {label}
    </div>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const data = payload[0]?.payload || {};

  return (
    <div className="min-w-[190px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs shadow-xl">
      <p className="mb-2 font-bold text-slate-800">{data.date || `${label} Mei 2026`}</p>
      <TooltipLine label="Hadir" value={data.hadir} valueClass="text-blue-600" />
      <TooltipLine label="Belum Presensi" value={data.belumPresensi} valueClass="text-slate-700" />
      <TooltipLine
        label="Tingkat Kehadiran"
        value={`${data.tingkatKehadiran}%`}
        valueClass="text-emerald-600"
      />
    </div>
  );
}

function TooltipLine({ label, value, valueClass }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-6">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function normalizeTrendData(trendData) {
  return trendData.map((item, index) => {
    if (typeof item === 'number') {
      const total = 128;
      const hadir = Math.round((item / 100) * total);

      return {
        day: index + 1,
        date: `${String(index + 1).padStart(2, '0')} Mei 2026`,
        hadir,
        belumPresensi: total - hadir,
        tingkatKehadiran: item,
      };
    }

    return {
      ...item,
      day: item.day || index + 1,
      date: item.date || `${String(index + 1).padStart(2, '0')} Mei 2026`,
      hadir: Number(item.hadir || 0),
      belumPresensi: Number(item.belumPresensi || 0),
      tingkatKehadiran: Number(item.tingkatKehadiran || 0),
    };
  });
}

function buildTrendByPeriod(data, period) {
  if (period === 'Harian') {
    return data.slice(-7).map((item) => ({ ...item, day: String(item.day) }));
  }

  if (period === 'Mingguan') {
    const groups = [];
    for (let index = 0; index < data.length; index += 7) {
      groups.push(data.slice(index, index + 7));
    }

    return groups.map((group, index) => {
      const hadir = sum(group.map((item) => item.hadir));
      const belumPresensi = sum(group.map((item) => item.belumPresensi));
      const tingkatKehadiran = Math.round(sum(group.map((item) => item.tingkatKehadiran)) / group.length);

      return {
        day: `M${index + 1}`,
        date: `Minggu ${index + 1} Mei 2026`,
        hadir,
        belumPresensi,
        tingkatKehadiran,
      };
    });
  }

  return data.map((item) => ({ ...item, day: String(item.day) }));
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function parseNumber(value) {
  const parsed = Number(String(value || 0).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const metricPalette = {
  blue: {
    box: 'bg-blue-50 text-blue-600 ring-blue-100',
    text: 'text-blue-600',
    dot: 'bg-blue-600',
    detail: 'text-slate-600',
    wash: 'from-blue-50/80',
  },
  emerald: {
    box: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    text: 'text-emerald-600',
    dot: 'bg-emerald-600',
    detail: 'text-emerald-700',
    wash: 'from-emerald-50/80',
  },
  amber: {
    box: 'bg-amber-50 text-amber-600 ring-amber-100',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
    detail: 'text-amber-700',
    wash: 'from-amber-50/80',
  },
  rose: {
    box: 'bg-rose-50 text-rose-600 ring-rose-100',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
    detail: 'text-rose-700',
    wash: 'from-rose-50/80',
  },
  red: {
    box: 'bg-red-50 text-red-600 ring-red-100',
    text: 'text-red-600',
    dot: 'bg-red-500',
    detail: 'text-red-700',
    wash: 'from-red-50/80',
  },
};
