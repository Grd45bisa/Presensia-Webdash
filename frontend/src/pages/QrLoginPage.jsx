import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Clock3,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  generateQrLoginToken,
  getEmployees,
  getQrLoginTokens,
  revokeQrLoginToken,
} from '@/lib/api/client';

const statusLabels = {
  active: 'Aktif',
  used: 'Terpakai',
  expired: 'Kedaluwarsa',
  revoked: 'Dibatalkan',
};

const statusClasses = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  used: 'border-blue-200 bg-blue-50 text-blue-700',
  expired: 'border-slate-200 bg-slate-50 text-slate-500',
  revoked: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function QrLoginPage() {
  const [employees, setEmployees] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState(5);
  const [qrPayload, setQrPayload] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [activeToken, setActiveToken] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.role !== 'admin'),
    [employees],
  );

  const selectedEmployee = employeeOptions.find((employee) => employee.id === selectedEmployeeId);

  const loadData = async () => {
    setIsLoading(true);

    try {
      const [employeeData, tokenData] = await Promise.all([
        getEmployees(),
        getQrLoginTokens(),
      ]);
      const employeeList = employeeData.employees || [];
      setEmployees(employeeList);
      setTokens(tokenData.tokens || []);
      setSelectedEmployeeId((current) => current || employeeList.find((employee) => employee.role !== 'admin')?.id || '');
      setMessage(tokenData.fallbackReason || '');
    } catch (err) {
      setMessage(`Gagal memuat QR Login. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderQr() {
      if (!qrPayload) {
        setQrImage('');
        return;
      }

      const dataUrl = await QRCode.toDataURL(qrPayload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      if (isMounted) setQrImage(dataUrl);
    }

    renderQr();

    return () => {
      isMounted = false;
    };
  }, [qrPayload]);

  const handleGenerate = async () => {
    if (!selectedEmployeeId) {
      setMessage('Pilih karyawan terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      const data = await generateQrLoginToken({
        employee_id: selectedEmployeeId,
        expires_in_minutes: Number(expiresInMinutes),
      });

      setQrPayload(data.qr_payload);
      setActiveToken(data.token_record);
      setTokens((current) => [data.token_record, ...current.filter((token) => token.id !== data.token_record.id)]);
      setMessage('QR login berhasil dibuat. Minta karyawan scan dari aplikasi Presensia.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (tokenId) => {
    try {
      const updated = await revokeQrLoginToken(tokenId);
      setTokens((current) => current.map((token) => (token.id === tokenId ? updated : token)));
      if (activeToken?.id === tokenId) {
        setActiveToken(updated);
        setQrPayload('');
      }
      setMessage('Token QR berhasil dibatalkan.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const copyPayload = async () => {
    if (!qrPayload) return;
    await navigator.clipboard.writeText(qrPayload);
    setMessage('Payload QR berhasil disalin.');
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QrStat title="Karyawan" value={employeeOptions.length} icon={Smartphone} tone="blue" />
        <QrStat title="QR Aktif" value={tokens.filter((token) => token.status === 'active').length} icon={QrCode} tone="emerald" />
        <QrStat title="Terpakai" value={tokens.filter((token) => token.status === 'used').length} icon={ShieldCheck} tone="indigo" />
        <QrStat title="Kedaluwarsa" value={tokens.filter((token) => token.status === 'expired').length} icon={Clock3} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 lg:px-5">
            <h3 className="text-lg font-bold text-slate-900">Secure QR Login</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Admin memilih akun karyawan, sistem membuat QR sekali pakai, lalu karyawan scan dari aplikasi Presensia.
            </p>
          </div>

          <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1fr_150px_auto] lg:items-end lg:px-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Karyawan</span>
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} - {employee.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Masa aktif</span>
              <select
                value={expiresInMinutes}
                onChange={(event) => setExpiresInMinutes(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                <option value={3}>3 menit</option>
                <option value={5}>5 menit</option>
                <option value={10}>10 menit</option>
                <option value={15}>15 menit</option>
              </select>
            </label>

            <Button onClick={handleGenerate} isLoading={isGenerating} className="gap-2">
              <QrCode size={16} />
              Generate QR
            </Button>
          </div>

          {message && (
            <div className="mx-4 mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 lg:mx-5">
              {message}
            </div>
          )}

          <div className="border-t border-slate-100">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Karyawan</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Expired</th>
                    <th className="px-5 py-3">Device</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-slate-500">Memuat token QR...</td>
                    </tr>
                  ) : tokens.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-10 text-center text-slate-500">Belum ada token QR.</td>
                    </tr>
                  ) : (
                    tokens.map((token) => (
                      <QrTokenRow key={token.id} token={token} onRevoke={handleRevoke} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {tokens.map((token) => (
                <QrTokenCard key={token.id} token={token} onRevoke={handleRevoke} />
              ))}
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-20 xl:self-start">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">QR Aktif</h3>
            <p className="mt-1 text-sm text-slate-500">Tampilkan layar ini ke karyawan saat login pertama.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex aspect-square items-center justify-center rounded-xl bg-white p-4 shadow-sm">
              {qrImage ? (
                <img src={qrImage} alt="QR Login Presensia" className="h-full w-full object-contain" />
              ) : (
                <div className="text-center text-sm font-semibold text-slate-400">
                  QR akan muncul setelah digenerate
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PreviewLine label="Akun" value={selectedEmployee?.full_name || '-'} />
            <PreviewLine label="Email" value={selectedEmployee?.email || '-'} />
            <PreviewLine label="Expired" value={activeToken ? formatDateTime(activeToken.expires_at) : '-'} />
            <PreviewLine label="Status" value={activeToken ? statusLabels[activeToken.status] : '-'} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <Button type="button" variant="secondary" onClick={copyPayload} disabled={!qrPayload} className="gap-2">
              <Copy size={15} />
              Salin Payload
            </Button>
            <Button type="button" variant="secondary" onClick={loadData} className="gap-2">
              <RefreshCw size={15} />
              Refresh
            </Button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function QrStat({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
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

function QrTokenRow({ token, onRevoke }) {
  return (
    <tr className="hover:bg-blue-50/40">
      <td className="px-5 py-3">
        <p className="font-bold text-slate-900">{token.employee_name}</p>
        <p className="mt-1 text-xs text-slate-500">{token.employee_email}</p>
      </td>
      <td className="px-5 py-3">
        <StatusBadge status={token.status} />
      </td>
      <td className="px-5 py-3 font-medium text-slate-700">{formatDateTime(token.expires_at)}</td>
      <td className="px-5 py-3 font-medium text-slate-700">{token.used_device_id || '-'}</td>
      <td className="px-5 py-3 text-right">
        <button
          onClick={() => onRevoke(token.id)}
          disabled={token.status !== 'active'}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <XCircle size={15} />
          Batalkan
        </button>
      </td>
    </tr>
  );
}

function QrTokenCard({ token, onRevoke }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{token.employee_name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{token.employee_email}</p>
        </div>
        <StatusBadge status={token.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <PreviewLine label="Expired" value={formatDateTime(token.expires_at)} compact />
        <PreviewLine label="Device" value={token.used_device_id || '-'} compact />
      </div>
      <button
        onClick={() => onRevoke(token.id)}
        disabled={token.status !== 'active'}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <XCircle size={15} />
        Batalkan
      </button>
    </article>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[status] || statusClasses.expired}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function PreviewLine({ label, value, compact = false }) {
  return (
    <div className={`rounded-lg border border-slate-100 bg-slate-50 px-3 ${compact ? 'py-2' : 'py-3'}`}>
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-800">{value || '-'}</p>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
