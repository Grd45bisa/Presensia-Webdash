import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock3,
  Download,
  Eye,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getAttendanceRecords } from '@/lib/api/client';

const statusLabel = {
  present: 'Hadir',
  late: 'Terlambat',
  fake_gps: 'Fake GPS',
  outside_geofence: 'Luar Geofence',
  absent: 'Absen',
};

const statusBadge = {
  present: 'hadir',
  late: 'terlambat',
  fake_gps: 'fake_gps',
  outside_geofence: 'luar_geofence',
  absent: 'absen',
};

const modeLabel = {
  office: 'Kantor',
  field: 'Lapangan',
  remote: 'Remote',
};

export default function PresensiPage() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [sourceInfo, setSourceInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [geofenceFilter, setGeofenceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadAttendance = async () => {
    setIsLoading(true);

    try {
      const data = await getAttendanceRecords();
      setRecords(data.records || []);
      setSummary(data.summary || null);
      setSourceInfo(data.fallbackReason || `Sumber data presensi: ${data.source || 'backend'}.`);
      setMessage('');
    } catch (err) {
      setMessage(`Gagal mengambil data presensi. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const dateOptions = useMemo(() => {
    return [...new Set(records.map((record) => record.date))].sort().reverse();
  }, [records]);

  const filteredRecords = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch = !keyword || [
        record.employee_name,
        record.employee_email,
        record.department,
        record.position,
        record.office_location_name,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesDate = dateFilter === 'all' || record.date === dateFilter;
      const matchesMode = modeFilter === 'all' || record.attendance_mode === modeFilter;
      const matchesGeofence = geofenceFilter === 'all' || record.geofence_status === geofenceFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      return matchesSearch && matchesDate && matchesMode && matchesGeofence && matchesStatus;
    });
  }, [records, searchQuery, dateFilter, modeFilter, geofenceFilter, statusFilter]);

  const calculatedSummary = useMemo(() => {
    if (summary) return summary;

    return {
      total: records.length,
      today: records.filter((record) => record.date === new Date().toISOString().slice(0, 10)).length,
      outsideGeofence: records.filter((record) => record.geofence_status === 'outside').length,
      fakeGps: records.filter((record) => record.is_mock_location).length,
      notCheckout: records.filter((record) => !record.check_out).length,
    };
  }, [records, summary]);

  const handleExportCsv = () => {
    const header = ['Tanggal', 'Nama', 'Tipe', 'Check-in', 'Check-out', 'Geofence', 'Fake GPS', 'Skor Wajah'];
    const rows = filteredRecords.map((record) => [
      record.date,
      record.employee_name,
      modeLabel[record.attendance_mode] || record.attendance_mode,
      formatTime(record.check_in),
      formatTime(record.check_out),
      record.geofence_status,
      record.is_mock_location ? 'Ya' : 'Tidak',
      formatScore(record.face_similarity),
    ]);

    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'presensi.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard title="Total Log" value={calculatedSummary.total} icon={UserCheck} tone="blue" />
        <StatCard title="Hari Ini" value={calculatedSummary.today} icon={Clock3} tone="emerald" />
        <StatCard title="Belum Checkout" value={calculatedSummary.notCheckout} icon={Clock3} tone="amber" />
        <StatCard title="Luar Geofence" value={calculatedSummary.outsideGeofence} icon={MapPin} tone="rose" />
        <StatCard title="Fake GPS" value={calculatedSummary.fakeGps} icon={LocateFixed} tone="red" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Log Presensi</h3>
            <p className="mt-1 text-sm text-slate-500">{sourceInfo}</p>
          </div>

          <Button variant="secondary" onClick={handleExportCsv} className="gap-2">
            <Download size={16} />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-4 py-4 lg:grid-cols-[1fr_auto]">
          <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, email, departemen, lokasi..."
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <FilterSelect value={dateFilter} onChange={setDateFilter}>
              <option value="all">Semua tanggal</option>
              {dateOptions.map((date) => (
                <option key={date} value={date}>{formatDate(date)}</option>
              ))}
            </FilterSelect>

            <FilterSelect value={modeFilter} onChange={setModeFilter}>
              <option value="all">Semua tipe</option>
              <option value="office">Kantor</option>
              <option value="field">Lapangan</option>
              <option value="remote">Remote</option>
            </FilterSelect>

            <FilterSelect value={geofenceFilter} onChange={setGeofenceFilter}>
              <option value="all">Semua geofence</option>
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
              <option value="not_checked">Tidak dicek</option>
            </FilterSelect>

            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="all">Semua status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="fake_gps">Fake GPS</option>
              <option value="outside_geofence">Luar Geofence</option>
            </FilterSelect>
          </div>
        </div>

        {message && (
          <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Check-in/out</th>
                <th className="px-5 py-3">Lokasi</th>
                <th className="px-5 py-3">Geofence</th>
                <th className="px-5 py-3">GPS</th>
                <th className="px-5 py-3">Skor Wajah</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-slate-500">
                    Memuat data presensi...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-10 text-center text-slate-500">
                    Tidak ada presensi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <AttendanceRow
                    key={record.id}
                    record={record}
                    onView={setSelectedRecord}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-sm font-medium text-slate-500">
          Menampilkan {filteredRecords.length} dari {records.length} log presensi
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Detail Presensi"
        size="xl"
      >
        {selectedRecord && <AttendanceDetail record={selectedRecord} />}
      </Modal>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'text-blue-700 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-700 bg-amber-50 border-amber-100',
    rose: 'text-rose-700 bg-rose-50 border-rose-100',
    red: 'text-red-700 bg-red-50 border-red-100',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
      <SlidersHorizontal size={16} className="shrink-0 text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-transparent outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function AttendanceRow({ record, onView }) {
  return (
    <tr className="hover:bg-blue-50/40">
      <td className="px-5 py-3 font-medium text-slate-700">{formatDate(record.date)}</td>
      <td className="px-5 py-3">
        <div>
          <p className="font-bold text-slate-900">{record.employee_name}</p>
          <p className="text-xs text-slate-500">{record.department} · {record.position}</p>
        </div>
      </td>
      <td className="px-5 py-3">
        <Badge type={record.attendance_mode}>{modeLabel[record.attendance_mode] || record.attendance_mode}</Badge>
      </td>
      <td className="px-5 py-3">
        <p className="font-semibold text-slate-800">{formatTime(record.check_in)}</p>
        <p className="text-xs text-slate-500">{formatTime(record.check_out)}</p>
      </td>
      <td className="px-5 py-3">
        <p className="font-medium text-slate-700">{record.office_location_name || 'Remote/Lapangan'}</p>
        <p className="text-xs text-slate-500">{formatCoordinate(record.latitude, record.longitude)}</p>
      </td>
      <td className="px-5 py-3">
        <Badge type={record.geofence_status === 'outside' ? 'luar_geofence' : 'hadir'}>
          {record.geofence_status === 'outside' ? 'Outside' : record.geofence_status === 'inside' ? 'Inside' : 'Tidak dicek'}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <p className="font-semibold text-slate-700">{formatMeters(record.gps_accuracy_meters)}</p>
        {record.is_mock_location && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-rose-600">
            <AlertTriangle size={13} />
            Fake GPS
          </p>
        )}
      </td>
      <td className="px-5 py-3 font-bold text-slate-800">{formatScore(record.face_similarity)}</td>
      <td className="px-5 py-3">
        <Badge type={statusBadge[record.status] || 'hadir'}>{statusLabel[record.status] || record.status}</Badge>
      </td>
      <td className="px-5 py-3 text-right">
        <button
          onClick={() => onView(record)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <Eye size={16} />
          Detail
        </button>
      </td>
    </tr>
  );
}

function AttendanceDetail({ record }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="font-bold text-slate-900">{record.employee_name}</h4>
          <p className="mt-1 text-sm text-slate-500">{record.department} · {record.position}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge type={record.attendance_mode}>{modeLabel[record.attendance_mode]}</Badge>
            <Badge type={statusBadge[record.status] || 'hadir'}>{statusLabel[record.status] || record.status}</Badge>
            {record.is_mock_location && <Badge type="fake_gps">Fake GPS</Badge>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailItem label="Tanggal" value={formatDate(record.date)} />
          <DetailItem label="Source" value={record.source} />
          <DetailItem label="Check-in" value={formatTime(record.check_in)} />
          <DetailItem label="Check-out" value={formatTime(record.check_out)} />
          <DetailItem label="Akurasi GPS" value={formatMeters(record.gps_accuracy_meters, 'meter')} />
          <DetailItem label="Jarak dari kantor" value={formatMeters(record.distance_from_office_meters, 'meter')} />
          <DetailItem label="Radius kantor" value={formatMeters(record.office_location_radius_meters, 'meter')} />
          <DetailItem label="Latitude" value={record.latitude ?? '-'} />
          <DetailItem label="Longitude" value={record.longitude ?? '-'} />
          <DetailItem label="Skor wajah" value={formatScore(record.face_similarity)} />
          <DetailItem label="Threshold wajah" value={formatScore(record.face_threshold)} />
          {record.note && <DetailItem label="Catatan audit" value={record.note} />}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <MapPin size={17} className="text-blue-600" />
            Preview Lokasi
          </div>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            Koordinat presensi: <strong>{formatCoordinate(record.latitude, record.longitude)}</strong>
            <br />
            Lokasi kantor: <strong>{record.office_location_name || 'Tidak terkait kantor'}</strong>
            <br />
            Radius kantor: <strong>{formatMeters(record.office_location_radius_meters, 'meter')}</strong>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldCheck size={17} className="text-emerald-600" />
            Bukti Foto
          </div>
          <img
            src={record.evidence_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(record.employee_name)}&background=random`}
            alt=""
            className="aspect-square w-full rounded-xl border border-slate-200 object-cover"
          />
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Foto bukti termasuk data sensitif. Saat Supabase Storage siap, gunakan signed URL private.
          </p>
        </div>
      </aside>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || '-'}</p>
    </div>
  );
}

function formatTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatScore(value) {
  if (value === null || value === undefined) return '-';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('id-ID');
}

function formatMeters(value, unit = 'm') {
  if (value === null || value === undefined) return `- ${unit}`;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return `- ${unit}`;

  const formatted = numericValue.toLocaleString('id-ID', {
    maximumFractionDigits: 1,
  });

  return `${formatted} ${unit}`;
}

function formatCoordinate(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return '-';
  }

  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}
