import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Camera,
  Database,
  MapPin,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getGlobalSettings,
  updateGlobalSettings,
} from '@/lib/api/client';

const defaultSettings = {
  organization: {
    name: 'PT Presensia Teknologi',
    address: 'Universitas Cendekia Abditama, Jl. Islamic Raya, Kelapa Dua, Tangerang',
    timezone: 'Asia/Jakarta',
    adminContact: 'hr@presensia.co.id',
  },
  attendance: {
    defaultRadiusMeters: 100,
    officeCheckInToleranceMinutes: 15,
    allowRemoteWithoutGeofence: true,
  },
  qrLogin: {
    expirationMinutes: 5,
    maxActiveTokensPerUser: 1,
  },
  faceSecurity: {
    minimumFaceThreshold: 0.7,
    requiresBlink: true,
    showEvidencePhotoToAdmin: true,
  },
  dashboard: {
    dataSource: 'auto',
  },
  admin: {
    auditLogEnabled: false,
    employeeWebReadOnly: true,
  },
};

export default function PengaturanPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState('idle');

  const loadSettings = async () => {
    setIsLoading(true);

    try {
      const data = await getGlobalSettings();
      setSettings(mergeSettings(defaultSettings, data));
      setMessage('Pengaturan global dimuat dari backend.');
    } catch (err) {
      setMessage(`Gagal memuat pengaturan. Memakai nilai default. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const summary = useMemo(() => ([
    {
      title: 'Radius Default',
      value: `${settings.attendance.defaultRadiusMeters}m`,
      icon: MapPin,
      tone: 'blue',
    },
    {
      title: 'QR Login',
      value: `${settings.qrLogin.expirationMinutes}m`,
      icon: QrCode,
      tone: 'emerald',
    },
    {
      title: 'Skor Wajah',
      value: settings.faceSecurity.minimumFaceThreshold.toFixed(2),
      icon: Camera,
      tone: 'amber',
    },
    {
      title: 'Sumber Data',
      value: settings.dashboard.dataSource,
      icon: Database,
      tone: 'violet',
    },
  ]), [settings]);

  const updateSection = (section, patch) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveState('idle');
    setMessage('Menyimpan pengaturan global...');

    try {
      const saved = await updateGlobalSettings(settings);
      setSettings(mergeSettings(defaultSettings, saved));
      setSaveState('success');
      setMessage('Pengaturan global berhasil disimpan.');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err) {
      setSaveState('error');
      setMessage(`Gagal menyimpan pengaturan. ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <SettingStat key={item.title} {...item} />
        ))}
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pengaturan Global Sistem</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Mengikuti blueprint dashboard: organisasi, presensi, QR login, face security, dan admin.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={loadSettings} disabled={isLoading} className="gap-2">
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Muat Ulang
                </Button>
                <Button type="button" onClick={handleSave} isLoading={isSaving} className="gap-2">
                  <Save size={16} />
                  Simpan
                </Button>
              </div>
            </div>

            {message && (
              <div className={`mx-4 mt-4 rounded-lg border px-4 py-3 text-sm font-medium lg:mx-5 ${
                saveState === 'error'
                  ? 'border-rose-100 bg-rose-50 text-rose-700'
                  : saveState === 'success'
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : 'border-blue-100 bg-blue-50 text-blue-700'
              }`}>
                {message}
              </div>
            )}

            <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-5">
              <SettingsPanel
                icon={Building2}
                tone="blue"
                title="Informasi Organisasi"
                description="Identitas perusahaan yang akan muncul di laporan dan konteks dashboard."
              >
                <TextField
                  label="Nama organisasi"
                  value={settings.organization.name}
                  onChange={(value) => updateSection('organization', { name: value })}
                />
                <TextArea
                  label="Alamat utama"
                  value={settings.organization.address}
                  onChange={(value) => updateSection('organization', { address: value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    label="Timezone"
                    value={settings.organization.timezone}
                    onChange={(value) => updateSection('organization', { timezone: value })}
                  />
                  <TextField
                    label="Kontak admin"
                    value={settings.organization.adminContact}
                    onChange={(value) => updateSection('organization', { adminContact: value })}
                  />
                </div>
              </SettingsPanel>

              <SettingsPanel
                icon={ShieldCheck}
                tone="emerald"
                title="Aturan Presensi"
                description="Default yang dipakai saat membuat lokasi kantor dan membaca status presensi."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="Default radius geofence"
                    suffix="meter"
                    min={25}
                    value={settings.attendance.defaultRadiusMeters}
                    onChange={(value) => updateSection('attendance', { defaultRadiusMeters: value })}
                  />
                  <NumberField
                    label="Toleransi terlambat"
                    suffix="menit"
                    min={0}
                    value={settings.attendance.officeCheckInToleranceMinutes}
                    onChange={(value) => updateSection('attendance', { officeCheckInToleranceMinutes: value })}
                  />
                </div>
                <ToggleRow
                  title="Remote boleh tanpa geofence"
                  description="User remote tidak wajib berada dalam radius kantor."
                  checked={settings.attendance.allowRemoteWithoutGeofence}
                  onChange={(checked) => updateSection('attendance', { allowRemoteWithoutGeofence: checked })}
                />
              </SettingsPanel>

              <SettingsPanel
                icon={QrCode}
                tone="violet"
                title="QR Login & Device"
                description="Aturan token QR saat admin membantu karyawan login ke mobile app."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField
                    label="Masa berlaku QR"
                    suffix="menit"
                    min={1}
                    value={settings.qrLogin.expirationMinutes}
                    onChange={(value) => updateSection('qrLogin', { expirationMinutes: value })}
                  />
                  <NumberField
                    label="Token aktif per user"
                    suffix="token"
                    min={1}
                    value={settings.qrLogin.maxActiveTokensPerUser}
                    onChange={(value) => updateSection('qrLogin', { maxActiveTokensPerUser: value })}
                  />
                </div>
              </SettingsPanel>

              <SettingsPanel
                icon={Smartphone}
                tone="amber"
                title="Face Security"
                description="Pengaturan verifikasi wajah dan liveness detection dari mobile app."
              >
                <NumberField
                  label="Minimum skor wajah"
                  suffix="0.00 - 1.00"
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  value={settings.faceSecurity.minimumFaceThreshold}
                  onChange={(value) => updateSection('faceSecurity', { minimumFaceThreshold: value })}
                />
                <ToggleRow
                  title="Wajib liveness blink"
                  description="Karyawan wajib berkedip saat validasi wajah."
                  checked={settings.faceSecurity.requiresBlink}
                  onChange={(checked) => updateSection('faceSecurity', { requiresBlink: checked })}
                />
                <ToggleRow
                  title="Admin boleh lihat foto bukti"
                  description="Foto bukti presensi hanya tampil untuk admin."
                  checked={settings.faceSecurity.showEvidencePhotoToAdmin}
                  onChange={(checked) => updateSection('faceSecurity', { showEvidencePhotoToAdmin: checked })}
                />
              </SettingsPanel>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <SettingsPanel
            icon={Database}
            tone="rose"
            title="Sumber Data"
            description="Pilih apakah dashboard membaca database asli atau data sementara."
          >
            <ToggleRow
              title="Gunakan database Supabase"
              description={settings.dashboard.dataSource === 'supabase'
                ? 'Dashboard sedang diarahkan ke data asli dari database.'
                : 'Dashboard sedang memakai data sementara untuk pengembangan.'}
              checked={settings.dashboard.dataSource === 'supabase'}
              onChange={(checked) => updateSection('dashboard', { dataSource: checked ? 'supabase' : 'mock' })}
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold text-slate-500">Mode aktif</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {settings.dashboard.dataSource === 'supabase' ? 'Database Supabase' : 'Data sementara'}
              </p>
            </div>
          </SettingsPanel>

          <SettingsPanel
            icon={UserCog}
            tone="slate"
            title="Admin & Akses"
            description="Fondasi untuk audit log dan employee web jika nanti dibutuhkan."
          >
            <ToggleRow
              title="Audit log admin"
              description="Simpan jejak perubahan penting oleh admin."
              checked={settings.admin.auditLogEnabled}
              onChange={(checked) => updateSection('admin', { auditLogEnabled: checked })}
            />
            <ToggleRow
              title="Employee web read-only"
              description="Jika web employee dibuka nanti, aksesnya hanya baca."
              checked={settings.admin.employeeWebReadOnly}
              onChange={(checked) => updateSection('admin', { employeeWebReadOnly: checked })}
            />
          </SettingsPanel>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
                <SlidersHorizontal size={19} />
              </div>
              <div>
                <p className="font-bold text-slate-900">Status Konfigurasi</p>
                <p className="text-xs text-slate-500">Backend in-memory tahap awal</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Blueprint menyarankan tabel `app_settings` jika pengaturan makin banyak. Untuk tahap ini disimpan di backend agar UI dan alur admin sudah siap.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SettingStat({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ icon: Icon, tone, title, description, children }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}>
            <Icon size={19} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900">{title}</h4>
            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <input
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <textarea
        value={value || ''}
        rows="3"
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function NumberField({ label, value, suffix, onChange, min, max, step = 1 }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ''}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 px-3 text-sm font-semibold text-slate-800 outline-none"
        />
        <span className="inline-flex items-center border-l border-slate-100 bg-slate-50 px-3 text-xs font-bold text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  );
}

function mergeSettings(base, value) {
  return {
    organization: { ...base.organization, ...(value.organization || {}) },
    attendance: { ...base.attendance, ...(value.attendance || {}) },
    qrLogin: { ...base.qrLogin, ...(value.qrLogin || {}) },
    faceSecurity: { ...base.faceSecurity, ...(value.faceSecurity || {}) },
    dashboard: { ...base.dashboard, ...(value.dashboard || {}) },
    admin: { ...base.admin, ...(value.admin || {}) },
  };
}
