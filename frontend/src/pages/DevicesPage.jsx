import { useEffect, useMemo, useState } from 'react';
import {
  Laptop,
  LogOut,
  RefreshCw,
  Search,
  ShieldOff,
  Smartphone,
  TabletSmartphone,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getDevices,
  resetEmployeeDevices,
  revokeDevice,
} from '@/lib/api/client';

const statusStyles = {
  online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  idle: 'border-amber-200 bg-amber-50 text-amber-700',
  logged_out: 'border-slate-200 bg-slate-50 text-slate-500',
};

const statusLabels = {
  online: 'Sedang aktif',
  idle: 'Idle',
  logged_out: 'Keluar',
};

export default function DevicesPage() {
  const [devices, setDevices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');

  const loadDevices = async () => {
    setIsLoading(true);

    try {
      const data = await getDevices();
      setDevices(data.devices || []);
      setMessage(data.fallbackReason || `Sumber data device: ${data.source || 'backend'}.`);
    } catch (err) {
      setMessage(`Gagal memuat device. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const enrichedDevices = useMemo(() => devices.map((device) => ({
    ...device,
    activity_status: getActivityStatus(device),
  })), [devices]);

  const filteredDevices = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return enrichedDevices.filter((device) => {
      const matchesSearch = !keyword || [
        device.employee_name,
        device.employee_email,
        device.device_id,
        device.device_name,
        device.platform,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesStatus = statusFilter === 'all' || device.activity_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [enrichedDevices, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: enrichedDevices.length,
    online: enrichedDevices.filter((device) => device.activity_status === 'online').length,
    idle: enrichedDevices.filter((device) => device.activity_status === 'idle').length,
    loggedOut: enrichedDevices.filter((device) => device.activity_status === 'logged_out').length,
  }), [enrichedDevices]);

  const handleRevoke = async (device) => {
    const confirmed = window.confirm(
      `Cabut/logout paksa device ${device.device_name} dari ${device.employee_name}?\n\nMobile app pada device ini akan keluar otomatis saat heartbeat berikutnya dan user wajib QR Login ulang.`
    );
    if (!confirmed) return;

    const key = `${device.employee_id}:${device.device_id}`;
    setBusyKey(key);

    try {
      await revokeDevice(device.employee_id, device.device_id);
      setDevices((current) => current.map((item) => (
        item.employee_id === device.employee_id && item.device_id === device.device_id
          ? { ...item, is_active: false, is_current_device: false, updated_at: new Date().toISOString() }
          : item
      )));
      setMessage('Device berhasil dicabut. Mobile app akan logout otomatis saat heartbeat berikutnya.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyKey('');
    }
  };

  const handleResetEmployee = async (device) => {
    const confirmed = window.confirm(
      `Reset user ${device.employee_name}?\n\nAksi ini akan menghapus data operasional user dari database: presensi, worklog, reminder, project, face embedding, QR token, timer, dan semua device. Akun karyawan tetap ada, tetapi user harus daftar wajah/QR Login ulang.`
    );
    if (!confirmed) return;

    const typed = window.prompt(`Ketik RESET untuk melanjutkan reset user ${device.employee_name}.`);
    if (typed !== 'RESET') {
      setMessage('Reset user dibatalkan.');
      return;
    }

    setBusyKey(`reset:${device.employee_id}`);

    try {
      await resetEmployeeDevices(device.employee_id);
      setDevices((current) => current.filter((item) => item.employee_id !== device.employee_id));
      setMessage('Data operasional user berhasil direset. User wajib QR Login ulang dan melakukan setup ulang.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusyKey('');
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <DeviceStat title="Total Device" value={stats.total} icon={TabletSmartphone} tone="blue" />
        <DeviceStat title="Sedang Aktif" value={stats.online} icon={Wifi} tone="emerald" />
        <DeviceStat title="Idle" value={stats.idle} icon={Laptop} tone="amber" />
        <DeviceStat title="Keluar" value={stats.loggedOut} icon={LogOut} tone="slate" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Device Binding</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Pantau device login karyawan, status terakhir, dan cabut paksa akses device lama.
            </p>
          </div>
          <Button onClick={loadDevices} variant="secondary" className="gap-2">
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:px-5">
          <label className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari karyawan, device, platform..."
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Semua status</option>
            <option value="online">Sedang aktif</option>
            <option value="idle">Idle</option>
            <option value="logged_out">Keluar</option>
          </select>
        </div>

        {message && (
          <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 lg:mx-5">
            {message}
          </div>
        )}

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Last Seen</th>
                <th className="px-5 py-3">Binding</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Memuat device...</td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Device tidak ditemukan.</td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <DeviceRow
                    key={`${device.employee_id}-${device.device_id}`}
                    device={device}
                    busyKey={busyKey}
                    onRevoke={handleRevoke}
                    onResetEmployee={handleResetEmployee}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Memuat device...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Device tidak ditemukan.
            </div>
          ) : (
            filteredDevices.map((device) => (
              <DeviceCard
                key={`${device.employee_id}-${device.device_id}`}
                device={device}
                busyKey={busyKey}
                onRevoke={handleRevoke}
                onResetEmployee={handleResetEmployee}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DeviceStat({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
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

function DeviceRow({ device, busyKey, onRevoke, onResetEmployee }) {
  const key = `${device.employee_id}:${device.device_id}`;

  return (
    <tr className="hover:bg-blue-50/40">
      <td className="px-5 py-3">
        <p className="font-bold text-slate-900">{device.employee_name}</p>
        <p className="mt-1 text-xs text-slate-500">{device.employee_email}</p>
      </td>
      <td className="px-5 py-3">
        <p className="font-bold text-slate-800">{device.device_name}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{device.platform} - {device.device_id}</p>
      </td>
      <td className="px-5 py-3"><StatusPill status={device.activity_status} /></td>
      <td className="px-5 py-3 font-medium text-slate-700">{formatRelative(device.last_seen_at)}</td>
      <td className="px-5 py-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
          device.is_current_device ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-100'
        }`}>
          {device.is_current_device ? 'Device utama' : 'Riwayat'}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onRevoke(device)}
            disabled={!device.is_active || busyKey === key}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShieldOff size={15} />
            Cabut
          </button>
          <button
            onClick={() => onResetEmployee(device)}
            disabled={busyKey === `reset:${device.employee_id}`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset User
          </button>
        </div>
      </td>
    </tr>
  );
}

function DeviceCard({ device, busyKey, onRevoke, onResetEmployee }) {
  const key = `${device.employee_id}:${device.device_id}`;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{device.employee_name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{device.employee_email}</p>
        </div>
        <StatusPill status={device.activity_status} />
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Smartphone size={16} className="text-blue-600" />
          {device.device_name}
        </div>
        <p className="mt-1 break-all text-xs font-medium text-slate-500">{device.platform} - {device.device_id}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <InfoPill label="Last seen" value={formatRelative(device.last_seen_at)} />
        <InfoPill label="Binding" value={device.is_current_device ? 'Device utama' : 'Riwayat'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <button
          onClick={() => onRevoke(device)}
          disabled={!device.is_active || busyKey === key}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShieldOff size={15} />
          Cabut Device
        </button>
        <button
          onClick={() => onResetEmployee(device)}
          disabled={busyKey === `reset:${device.employee_id}`}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset User
        </button>
      </div>
    </article>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

function InfoPill({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-800">{value || '-'}</p>
    </div>
  );
}

function getActivityStatus(device) {
  if (!device.is_active) return 'logged_out';
  if (!device.last_seen_at) return 'idle';

  const lastSeen = new Date(device.last_seen_at).getTime();
  const diffMinutes = (Date.now() - lastSeen) / 60000;
  return diffMinutes <= 3 ? 'online' : 'idle';
}

function formatRelative(value) {
  if (!value) return '-';
  const diffSeconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));

  if (diffSeconds < 60) return `${diffSeconds} detik lalu`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} hari lalu`;
}
