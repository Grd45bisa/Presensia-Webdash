import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Download,
  FileBarChart,
  MapPinOff,
  Printer,
  Search,
  ShieldAlert,
  TimerReset,
  UsersRound,
  Filter,
  CheckCircle2,
  Building2,
  Calendar,
  AlertTriangle,
  User,
  Compass,
  Smile,
  RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  exportAttendanceReportCsv,
  getAttendanceReport,
} from '@/lib/api/client';

const today = new Date();
const defaultTo = toDateInput(today);
const defaultFrom = toDateInput(new Date(today.getFullYear(), today.getMonth(), 1));

export default function LaporanPage() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    employees: 0,
    present: 0,
    late: 0,
    outside: 0,
    fake_gps: 0,
    not_checkout: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    from: defaultFrom,
    to: defaultTo,
    department: '',
    status: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAttendanceReport({
        ...filters,
        search: searchQuery,
      });
      setRecords(data.records || []);
      setDepartments(data.departments || []);
      setSummary(data.summary || {
        total: 0,
        employees: 0,
        present: 0,
        late: 0,
        outside: 0,
        fake_gps: 0,
        not_checkout: 0
      });
      if (data.fallbackReason) {
        setMessage(data.fallbackReason);
      } else {
        setMessage('');
      }
    } catch (err) {
      setMessage(`Gagal memuat data laporan. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.department, filters.status]);

  const filteredRecords = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = !keyword || [
        record.employee_name,
        record.department,
        record.position,
        record.office_location_name,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));

      return matchesSearch;
    });
  }, [records, searchQuery]);

  const stats = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        total: summary.total || 0,
        employees: summary.employees || 0,
        present: summary.present || 0,
        late: summary.late || 0,
        outside: summary.outside || 0,
        fakeGps: summary.fake_gps || 0,
        notCheckout: summary.not_checkout || 0
      };
    }

    const uniqueEmployees = new Set(filteredRecords.map((record) => record.employee_id));

    return {
      total: filteredRecords.length,
      employees: uniqueEmployees.size,
      present: filteredRecords.filter((record) => getReportStatus(record) === 'present').length,
      late: filteredRecords.filter((record) => getReportStatus(record) === 'late').length,
      outside: filteredRecords.filter((record) => record.geofence_status === 'outside').length,
      fakeGps: filteredRecords.filter((record) => record.is_mock_location).length,
      notCheckout: filteredRecords.filter((record) => !record.check_out).length
    };
  }, [filteredRecords, searchQuery, summary]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      from: defaultFrom,
      to: defaultTo,
      department: '',
      status: '',
    });
    setSearchQuery('');
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAttendanceReportCsv({
        ...filters,
        search: searchQuery,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Presensi_${filters.from}_${filters.to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(`Gagal ekspor CSV: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 print:pb-0 print:space-y-4">

      {/* Fallback Banner Status */}
      {message && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium transition-all shadow-xs print:hidden animate-fade-in">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 animate-pulse" />
          <span>{message}</span>
        </div>
      )}

      {/* Top Header - Responsive & modern */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">Laporan & Analisis</span>
          <h2 className="text-xl font-bold text-slate-800 mt-2">Rekapitulasi Presensi Karyawan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis keterlambatan, geofence, liveness similarity, dan ekspor laporan.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleResetFilters}
            className="flex-1 md:flex-none gap-2 h-10 px-4"
            disabled={isLoading}
          >
            <RefreshCw size={15} />
            Reset Filter
          </Button>
          <Button
            onClick={handlePrintPDF}
            className="flex-1 md:flex-none gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-bold"
          >
            <Printer size={15} />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-wide uppercase">Laporan Presensi Karyawan</h1>
        <p className="text-md text-slate-700 mt-1 font-semibold">Sistem Presensi Deteksi Wajah & Geofence (Presensia)</p>
        <p className="mt-1 text-xs text-slate-500">
          Periode Rekap: <span className="font-bold">{formatDate(filters.from)}</span> s.d. <span className="font-bold">{formatDate(filters.to)}</span>
        </p>
        {filters.department && (
          <p className="text-xs text-slate-500 mt-0.5">
            Departemen: <span className="font-bold">{filters.department}</span>
          </p>
        )}
      </div>

      {/* STAT CARDS GRID - 5 cards that scale beautifully */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 print:grid-cols-5">
        <ReportStat
          title="Total Presensi"
          value={stats.total}
          icon={FileBarChart}
          tone="blue"
          desc="Log data terfilter"
        />
        <ReportStat
          title="Karyawan Aktif"
          value={stats.employees}
          icon={UsersRound}
          tone="emerald"
          desc="Telah melakukan absensi"
        />
        <ReportStat
          title="Total Terlambat"
          value={stats.late}
          icon={TimerReset}
          tone="amber"
          desc="Check-in melewati jam"
        />
        <ReportStat
          title="Luar Geofence"
          value={stats.outside}
          icon={MapPinOff}
          tone="rose"
          desc="Titik koordinat luar area"
        />
        <ReportStat
          title="Fake GPS"
          value={stats.fakeGps}
          icon={ShieldAlert}
          tone="red"
          desc="Indikasi pemalsuan GPS"
          alert={stats.fakeGps > 0}
        />
      </section>

      {/* MAIN TWO-COLUMN GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:grid-cols-1">

        {/* LEFT COLUMN: FILTERS & DATA TABLE (Tough part of responsiveness) */}
        <div className="lg:col-span-2 xl:col-span-3 space-y-6">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none">

            {/* Filter and Search header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4 print:hidden">
              <div className="flex items-center gap-2 text-slate-800">
                <Filter size={16} className="text-blue-600" />
                <span className="font-bold text-sm">Filter & Pencarian Laporan</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {/* Search */}
                <div className="sm:col-span-2 relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari karyawan, jabatan, kantor..."
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Date From */}
                <DateField label="Mulai" name="from" value={filters.from} onChange={handleFilterChange} />

                {/* Date To */}
                <DateField label="Selesai" name="to" value={filters.to} onChange={handleFilterChange} />

                {/* Department Dropdown */}
                <div className="relative">
                  <select
                    name="department"
                    value={filters.department}
                    onChange={handleFilterChange}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 outline-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  >
                    <option value="">Departemen</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick status badges */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-400 uppercase mr-1">Status:</span>
                <StatusFilterBtn active={filters.status === ''} label="Semua" onClick={() => setFilters(f => ({...f, status: ''}))} />
                <StatusFilterBtn active={filters.status === 'present'} label="Hadir" onClick={() => setFilters(f => ({...f, status: 'present'}))} />
                <StatusFilterBtn active={filters.status === 'late'} label="Terlambat" onClick={() => setFilters(f => ({...f, status: 'late'}))} />
                <StatusFilterBtn active={filters.status === 'outside'} label="Luar Geofence" onClick={() => setFilters(f => ({...f, status: 'outside'}))} />
                <StatusFilterBtn active={filters.status === 'fake_gps'} label="Fake GPS" onClick={() => setFilters(f => ({...f, status: 'fake_gps'}))} />
              </div>
            </div>

            {/* TABLE CONTAINER FOR SCREEN > 1024px */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3.5">Karyawan</th>
                    <th className="px-5 py-3.5">Tanggal</th>
                    <th className="px-5 py-3.5">Presensi Masuk</th>
                    <th className="px-5 py-3.5">Presensi Keluar</th>
                    <th className="px-5 py-3.5">Jam Kerja</th>
                    <th className="px-5 py-3.5">Tipe Kerja</th>
                    <th className="px-5 py-3.5">Verifikasi & GPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <TableSkeletonRows />
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-16">
                        <EmptyReportState onReset={handleResetFilters} />
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((row) => (
                      <ReportRow key={row.id} row={row} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE LAYOUT CARDS FOR SCREEN < 768px (Beautiful Grid Fallback) */}
            <div className="md:hidden p-4 space-y-4 print:hidden">
              {isLoading ? (
                <MobileCardSkeleton />
              ) : filteredRecords.length === 0 ? (
                <EmptyReportState onReset={handleResetFilters} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredRecords.map((row) => (
                    <ReportCard key={row.id} row={row} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: QUICK METRICS & EXPORT OPTIONS */}
        <div className="space-y-6 print:hidden">

          {/* Card: Panel Ekspor Laporan */}
          <aside className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-5">
            <div>
              <h3 className="font-bold text-slate-800 text-md">Ekspor Cepat</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">Format standar data presensi untuk kebutuhan payroll/kepegawaian HR.</p>
            </div>

            <div className="space-y-2.5">
              <ExportDetailLine label="Rentang Tanggal" value={`${filters.from} s.d. ${filters.to}`} icon={Calendar} />
              <ExportDetailLine label="Departemen" value={filters.department || 'Semua Departemen'} icon={Building2} />
              <ExportDetailLine label="Jumlah Baris" value={`${filteredRecords.length} Data Karyawan`} icon={UsersRound} />
            </div>

            <div className="grid gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                onClick={handleExportCSV}
                isLoading={isExporting}
                className="w-full flex items-center justify-center gap-2 h-11 border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                <Download size={16} />
                Unduh Data CSV
              </Button>
              <Button
                onClick={handlePrintPDF}
                className="w-full flex items-center justify-center gap-2 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Printer size={16} />
                Cetak PDF Laporan
              </Button>
            </div>
          </aside>

          {/* Card: Edukasi Liveness & Geofence (Nice addition based on context) */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-xs">
            <h4 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <Smile size={16} className="text-blue-600" />
              Sistem Keamanan Deteksi
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed mt-2">
              Website ini menyinkronkan data secara otomatis dari aplikasi mobile. Sistem melakukan dua tahap verifikasi cerdas:
            </p>
            <ul className="text-xs text-blue-700 space-y-1.5 mt-3 pl-1">
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span><strong>Liveness & Skor:</strong> Membandingkan embedding foto presensi dengan dataset wajah terdaftar (threshold 0.85).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-blue-500 font-bold">•</span>
                <span><strong>Radius Geofence:</strong> Memastikan karyawan kantor mematuhi koordinat geolokasi geofence GPS asli.</span>
              </li>
            </ul>
          </section>

        </div>

      </section>

      {/* PRINT-ONLY SIGN OFF */}
      <div className="hidden print:flex justify-between items-center mt-20 px-8 text-sm text-slate-700">
        <div>
          <p className="italic">Laporan ini dibuat secara otomatis oleh sistem Presensia.</p>
          <p>Dicetak pada: {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(new Date())}</p>
        </div>
        <div className="text-center w-64">
          <p className="mb-16 font-semibold">Diketahui & Disahkan oleh,</p>
          <p className="border-t border-slate-400 pt-2 font-bold text-slate-900">HR & Admin Department</p>
        </div>
      </div>

    </div>
  );
}

// ─── SUB-COMPONENTS & HELPERS ───────────────────────────────────────────────────

function ReportStat({ title, value, icon: Icon, tone, desc, alert }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/50 text-blue-600',
    emerald: 'border-emerald-100 bg-emerald-50/50 text-emerald-600',
    amber: 'border-amber-100 bg-amber-50/50 text-amber-600',
    rose: 'border-rose-100 bg-rose-50/50 text-rose-600',
    red: 'border-red-100 bg-red-50/50 text-red-600',
  };

  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm duration-200 print:shadow-none print:border-slate-300 ${
      alert ? 'ring-1 ring-red-200 bg-red-50/10' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase">{title}</span>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tones[tone]} ${alert ? 'animate-bounce' : ''}`}>
          <Icon size={17} />
        </div>
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
        <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">{desc}</p>
      </div>
    </div>
  );
}

function DateField({ label, name, value, onChange }) {
  return (
    <label className="relative block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <CalendarDays size={15} />
      </span>
      <input
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 outline-none bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
      />
    </label>
  );
}

function StatusFilterBtn({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function ExportDetailLine({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className="p-2 rounded-lg bg-white border border-slate-100 text-slate-500">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <span className="block text-[10px] font-bold text-slate-400 uppercase">{label}</span>
        <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">{value}</span>
      </div>
    </div>
  );
}

function ReportRow({ row }) {
  const isLate = isAttendanceLate(row);

  return (
    <tr className="hover:bg-blue-50/30 transition-colors print:hover:bg-transparent">
      {/* Karyawan Profile */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 text-sm">
            {getInitials(row.employee_name)}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate">{row.employee_name}</p>
            <p className="text-slate-400 text-xs truncate mt-0.5">{row.position} • {row.department}</p>
          </div>
        </div>
      </td>

      {/* Tanggal */}
      <td className="px-5 py-3.5">
        <div className="text-slate-700 font-semibold text-sm">{formatDate(row.date)}</div>
      </td>

      {/* Jam Masuk */}
      <td className="px-5 py-3.5">
        <div>
          <span className={`font-bold text-sm ${isLate ? 'text-amber-600' : 'text-slate-700'}`}>
            {formatTime(row.check_in)}
          </span>
          {isLate && (
            <span className="block text-[10px] text-amber-500 font-bold uppercase mt-0.5">{lateLabel(row)}</span>
          )}
        </div>
      </td>

      {/* Jam Keluar */}
      <td className="px-5 py-3.5">
        <span className="font-bold text-sm text-slate-700">
          {formatTime(row.check_out)}
        </span>
      </td>

      {/* Total Jam Kerja */}
      <td className="px-5 py-3.5">
        <div>
          <span className="font-bold text-sm text-slate-700">{workDuration(row.check_in, row.check_out)}</span>
          <span className={`block text-[10px] font-bold uppercase mt-0.5 ${isLate ? 'text-amber-500' : 'text-emerald-600'}`}>
            {isLate ? lateLabel(row) : 'Tidak terlambat'}
          </span>
        </div>
      </td>

      {/* Tipe Kerja */}
      <td className="px-5 py-3.5">
        <Badge type={row.attendance_mode}>{attendanceModeLabel(row.attendance_mode)}</Badge>
      </td>

      {/* Status Geofence & Liveness */}
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <LocationBadge row={row} />
          </div>
          {row.face_similarity !== undefined && row.face_similarity !== null && (
            <span className={`text-[10px] font-bold ${row.face_similarity >= 0.85 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Liveness: {Math.round(row.face_similarity * 100)}% Match
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ReportCard({ row }) {
  const isLate = isAttendanceLate(row);

  return (
    <article className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-xs transition-shadow flex flex-col justify-between h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
            {getInitials(row.employee_name)}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-800 text-sm truncate">{row.employee_name}</h4>
            <p className="text-slate-400 text-xs truncate mt-0.5">{row.position} • {row.department}</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
          {formatDate(row.date)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-xs">
        <div>
          <span className="block text-[10px] text-slate-400 font-medium">Masuk</span>
          <span className={`font-bold mt-0.5 block ${isLate ? 'text-amber-600' : 'text-slate-700'}`}>
            {formatTime(row.check_in)}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-400 font-medium">Keluar</span>
          <span className="font-bold mt-0.5 block text-slate-700">
            {formatTime(row.check_out)}
          </span>
        </div>
        <div className="col-span-2 border-t border-slate-100 pt-2">
          <span className="block text-[10px] text-slate-400 font-medium">Total jam kerja</span>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="font-bold text-slate-700">{workDuration(row.check_in, row.check_out)}</span>
            <span className={`text-[10px] font-bold uppercase ${isLate ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isLate ? lateLabel(row) : 'Tidak terlambat'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
        <Badge type={row.attendance_mode}>{attendanceModeLabel(row.attendance_mode)}</Badge>
        <div className="flex flex-col items-end gap-1">
          <LocationBadge row={row} />
          {row.face_similarity !== undefined && row.face_similarity !== null && (
            <span className={`text-[10px] font-bold ${row.face_similarity >= 0.85 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Liveness: {Math.round(row.face_similarity * 100)}%
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function LocationBadge({ row }) {
  if (row.is_mock_location) return <Badge type="fake_gps">Fake GPS</Badge>;
  if (row.geofence_status === 'inside') return <Badge type="hadir">Dalam Area</Badge>;
  if (row.geofence_status === 'outside') return <Badge type="luar_geofence">Luar Area</Badge>;
  return <span className="text-xs font-semibold italic text-slate-400">Bebas Area</span>;
}

function isAttendanceLate(row) {
  return row.schedule_status === 'late'
    || Number(row.late_minutes || 0) > 0
    || row.status === 'late'
    || row.status === 'terlambat';
}

function lateLabel(row) {
  const minutes = Number(row.late_minutes || 0);
  return minutes > 0 ? `Terlambat ${minutes} menit` : 'Terlambat';
}

function workDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '-';
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours <= 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

function EmptyReportState({ onReset }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
        <FileBarChart size={28} />
      </div>
      <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Data Laporan</h4>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
        Pencarian atau filter yang Anda masukkan tidak mencocokkan log presensi mana pun pada periode ini.
      </p>
      <button
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors cursor-pointer"
      >
        Lihat Semua Data
      </button>
    </div>
  );
}

function TableSkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-4 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-200 rounded w-1/2" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-24" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-14" />
      </td>
      <td className="px-5 py-4">
        <div className="h-4 bg-slate-200 rounded w-14" />
      </td>
      <td className="px-5 py-4">
        <div className="h-5 bg-slate-200 rounded-full w-16" />
      </td>
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-200 rounded w-16" />
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="space-y-1.5">
          <div className="h-5 bg-slate-200 rounded-full w-20" />
          <div className="h-3 bg-slate-200 rounded w-14" />
        </div>
      </td>
    </tr>
  ));
}

function MobileCardSkeleton() {
  return Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="space-y-1">
            <div className="h-3.5 bg-slate-200 rounded w-24" />
            <div className="h-2.5 bg-slate-200 rounded w-16" />
          </div>
        </div>
        <div className="h-4 bg-slate-200 rounded w-14" />
      </div>
      <div className="grid grid-cols-2 gap-2 h-12 bg-slate-100/50 rounded-xl" />
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-200 rounded-full w-16" />
        <div className="h-5 bg-slate-200 rounded-full w-20" />
      </div>
    </div>
  ));
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function getReportStatus(row) {
  if (row.is_mock_location) return 'fake_gps';
  if (row.geofence_status === 'outside') return 'outside';
  if (row.status === 'late' || row.status === 'terlambat') return 'late';
  return 'present';
}

function attendanceModeLabel(value) {
  if (value === 'field') return 'Lapangan';
  if (value === 'remote') return 'Remote';
  return 'Kantor';
}

function getInitials(name) {
  if (!name) return 'K';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(value) {
  if (!value) return '-';
  // Standardizing format to prevent timezone offset bugs
  try {
    const d = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(d);
  } catch (e) {
    return value;
  }
}

function formatTime(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch (e) {
    return '-';
  }
}

function toDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
