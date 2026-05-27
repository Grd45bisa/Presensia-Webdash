import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Edit3,
  ExternalLink,
  MapPin,
  Plus,
  Radar,
  Route,
  Search,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  createOfficeLocation,
  deleteOfficeLocation,
  getOfficeLocations,
  resolveOfficeMapLink,
  updateOfficeLocation,
} from '@/lib/api/client';

const defaultForm = {
  name: 'Kantor Islamic Raya',
  address: 'Universitas Cendekia Abditama, Jl. Islamic Raya, Klp. Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15811',
  latitude: -6.227905,
  longitude: 106.6167849,
  radius_meters: 100,
  is_active: true,
  maps_url: 'https://maps.app.goo.gl/V9ZZosTkcAp7q93x8',
};

export default function LokasiKantorPage() {
  const [offices, setOffices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceInfo, setSourceInfo] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResolvingMap, setIsResolvingMap] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [previewOfficeId, setPreviewOfficeId] = useState(null);
  const [form, setForm] = useState(defaultForm);

  const loadOffices = async () => {
    setIsLoading(true);

    try {
      const data = await getOfficeLocations();
      setOffices(data.offices || []);
      setPreviewOfficeId((current) => current || data.offices?.[0]?.id || null);
      setSourceInfo(data.fallbackReason || `Sumber data lokasi: ${data.source || 'backend'}.`);
    } catch (err) {
      setMessage(`Gagal mengambil lokasi kantor. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffices();
  }, []);

  const filteredOffices = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return offices.filter((office) => !keyword || [
      office.name,
      office.address,
      office.latitude,
      office.longitude,
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [offices, searchQuery]);

  const activeCount = offices.filter((office) => office.is_active).length;
  const totalUsers = offices.reduce((sum, office) => sum + Number(office.employee_count || 0), 0);
  const selectedPreviewOffice = useMemo(() => {
    const byId = offices.find((office) => office.id === previewOfficeId);
    return byId || filteredOffices[0] || defaultForm;
  }, [filteredOffices, offices, previewOfficeId]);

  const openCreateModal = () => {
    setSelectedOffice(null);
    setForm(defaultForm);
    setModalMode('create');
  };

  const openEditModal = (office) => {
    setSelectedOffice(office);
    setForm({
      name: office.name || '',
      address: office.address || '',
      latitude: office.latitude,
      longitude: office.longitude,
      radius_meters: office.radius_meters || 100,
      is_active: Boolean(office.is_active),
      maps_url: office.maps_url || '',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedOffice(null);
    setForm(defaultForm);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const useIslamicRayaPoint = () => {
    setForm((current) => ({
      ...current,
      ...defaultForm,
    }));
  };

  const handleResolveMapsLink = async () => {
    if (!form.maps_url) {
      setMessage('Isi link Google Maps terlebih dahulu.');
      return;
    }

    setIsResolvingMap(true);
    setMessage('');

    try {
      const resolved = await resolveOfficeMapLink(form.maps_url);
      setForm((current) => ({
        ...current,
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        maps_url: resolved.resolved_url || current.maps_url,
      }));
      setMessage('Koordinat berhasil diambil dari link Google Maps.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsResolvingMap(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    const payload = {
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters),
    };

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude) || !Number.isFinite(payload.radius_meters)) {
      setMessage('Latitude, longitude, dan radius harus berupa angka valid.');
      setIsSaving(false);
      return;
    }

    if (payload.radius_meters < 25) {
      setMessage('Radius geofence minimal 25 meter.');
      setIsSaving(false);
      return;
    }

    try {
      if (modalMode === 'create') {
        const created = await createOfficeLocation(payload);
        setOffices((current) => [created, ...current]);
        setPreviewOfficeId(created.id);
        setMessage('Lokasi kantor berhasil ditambahkan.');
      } else {
        const updated = await updateOfficeLocation(selectedOffice.id, payload);
        setOffices((current) => current.map((office) => (
          office.id === selectedOffice.id ? { ...office, ...updated } : office
        )));
        setPreviewOfficeId(selectedOffice.id);
        setMessage('Lokasi kantor berhasil diperbarui.');
      }

      closeModal();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (office) => {
    const confirmed = window.confirm(`Hapus lokasi ${office.name}?`);
    if (!confirmed) return;

    try {
      await deleteOfficeLocation(office.id);
      setOffices((current) => current.filter((item) => item.id !== office.id));
      setPreviewOfficeId((current) => (current === office.id ? null : current));
      setMessage('Lokasi kantor berhasil dihapus.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <LocationStat title="Total Lokasi" value={offices.length} icon={Building2} tone="blue" />
        <LocationStat title="Lokasi Aktif" value={activeCount} icon={MapPin} tone="emerald" />
        <LocationStat title="Total Radius" value={`${averageRadius(offices)}m`} icon={Radar} tone="amber" />
        <LocationStat title="User Terkait" value={totalUsers} icon={Building2} tone="violet" />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-slate-900">Lokasi Kantor & Geofence</h3>
              <p className="mt-1 text-sm text-slate-500">{sourceInfo}</p>
            </div>

            <Button onClick={openCreateModal} className="w-full gap-2 sm:w-auto">
              <Plus size={16} />
              Tambah Lokasi
            </Button>
          </div>

          <div className="border-b border-slate-100 px-4 py-4 lg:px-5">
            <label className="flex h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
              <Search size={17} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama lokasi, alamat, atau koordinat..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {message && (
            <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
              {message}
            </div>
          )}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Lokasi</th>
                  <th className="px-5 py-3">Koordinat</th>
                  <th className="px-5 py-3">Radius</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Memuat lokasi kantor...</td>
                  </tr>
                ) : filteredOffices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center text-slate-500">Lokasi kantor tidak ditemukan.</td>
                  </tr>
                ) : (
                  filteredOffices.map((office) => (
                    <OfficeRow
                      key={office.id}
                      office={office}
                      isSelected={selectedPreviewOffice.id === office.id}
                      onSelect={() => setPreviewOfficeId(office.id)}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                Memuat lokasi kantor...
              </div>
            ) : filteredOffices.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                Lokasi kantor tidak ditemukan.
              </div>
            ) : (
              filteredOffices.map((office) => (
                <OfficeMobileCard
                  key={office.id}
                  office={office}
                  isSelected={selectedPreviewOffice.id === office.id}
                  onSelect={() => setPreviewOfficeId(office.id)}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </div>

        <MapPreview office={selectedPreviewOffice} />
      </section>

      <Modal
        isOpen={Boolean(modalMode)}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Tambah Lokasi Kantor' : 'Edit Lokasi Kantor'}
        size="lg"
      >
        <OfficeForm
          form={form}
          isSaving={isSaving}
          isResolvingMap={isResolvingMap}
          onChange={handleChange}
          onUseIslamicRayaPoint={useIslamicRayaPoint}
          onResolveMapsLink={handleResolveMapsLink}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

function LocationStat({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function OfficeRow({ office, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer hover:bg-blue-50/40 ${isSelected ? 'bg-blue-50/60' : ''}`}
    >
      <td className="px-5 py-3">
        <p className="font-bold text-slate-900">{office.name}</p>
        <p className="mt-1 max-w-md truncate text-xs text-slate-500">{office.address}</p>
      </td>
      <td className="px-5 py-3 font-medium text-slate-700">
        {Number(office.latitude).toFixed(6)}, {Number(office.longitude).toFixed(6)}
      </td>
      <td className="px-5 py-3">
        <Badge type="office">{office.radius_meters} meter</Badge>
      </td>
      <td className="px-5 py-3 font-semibold text-slate-700">{office.employee_count || 0} karyawan</td>
      <td className="px-5 py-3">
        <Badge type={office.is_active ? 'active' : 'inactive_device'}>
          {office.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(office);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            title="Edit lokasi"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(office);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            title="Hapus lokasi"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function OfficeMobileCard({ office, isSelected, onSelect, onEdit, onDelete }) {
  return (
    <article
      onClick={onSelect}
      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
        isSelected ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{office.name}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{office.address}</p>
        </div>
        <Badge type={office.is_active ? 'active' : 'inactive_device'}>
          {office.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <InfoPill label="Radius" value={`${office.radius_meters}m`} />
        <InfoPill label="User" value={`${office.employee_count || 0} karyawan`} />
        <InfoPill label="Latitude" value={Number(office.latitude).toFixed(6)} />
        <InfoPill label="Longitude" value={Number(office.longitude).toFixed(6)} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onEdit(office);
          }}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
        >
          <Edit3 size={15} />
          Edit
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDelete(office);
          }}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 size={15} />
          Hapus
        </button>
      </div>
    </article>
  );
}

function MapPreview({ office }) {
  const radius = Number(office.radius_meters || 100);
  const latitude = Number(office.latitude || defaultForm.latitude);
  const longitude = Number(office.longitude || defaultForm.longitude);
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=18&output=embed`;
  const mapsUrl = office.maps_url || `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm 2xl:sticky 2xl:top-20 2xl:self-start">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between 2xl:block">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900">Preview Geofence</h3>
          <p className="mt-1 text-sm text-slate-500">Titik kantor dari koordinat yang akan dipakai mobile app.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
          <Route size={14} />
          {radius}m radius
        </span>
      </div>

      <div className="relative h-[260px] overflow-hidden rounded-xl border border-slate-200 bg-blue-50 sm:h-[340px] 2xl:h-[360px]">
        <iframe
          title={`Peta ${office.name || 'lokasi kantor'}`}
          src={mapsEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border border-white/70 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{office.name}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Radius validasi: {radius} meter
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
              <MapPin size={13} />
              Pin aktif
            </span>
          </div>
        </div>
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-bold text-blue-700 hover:bg-blue-50"
      >
        <ExternalLink size={15} />
        Buka titik ini di Google Maps
      </a>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 2xl:grid-cols-1">
        <InfoLine label="Lokasi" value={office.name} />
        <InfoLine label="Alamat" value={office.address} />
        <InfoLine label="Latitude" value={office.latitude} />
        <InfoLine label="Longitude" value={office.longitude} />
      </div>
    </aside>
  );
}

function OfficeForm({
  form,
  isSaving,
  isResolvingMap,
  onChange,
  onUseIslamicRayaPoint,
  onResolveMapsLink,
  onSubmit,
  onCancel,
}) {
  const latitude = Number(form.latitude || defaultForm.latitude);
  const longitude = Number(form.longitude || defaultForm.longitude);
  const mapsUrl = form.maps_url || `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nama lokasi" name="name" value={form.name} onChange={onChange} required />
        <FormField label="Radius geofence (meter)" name="radius_meters" type="number" min="25" max="1000" value={form.radius_meters} onChange={onChange} required />
        <FormField label="Latitude" name="latitude" type="number" step="any" value={form.latitude} onChange={onChange} required />
        <FormField label="Longitude" name="longitude" type="number" step="any" value={form.longitude} onChange={onChange} required />
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Link Google Maps</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="maps_url"
              value={form.maps_url ?? ''}
              type="url"
              onChange={onChange}
              placeholder="https://maps.app.goo.gl/..."
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={onResolveMapsLink}
              isLoading={isResolvingMap}
              className="shrink-0"
            >
              Ambil Koordinat
            </Button>
          </div>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-600">Alamat</span>
          <textarea
            name="address"
            value={form.address || ''}
            onChange={onChange}
            rows="3"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-blue-900">Pastikan pin kantor tepat</p>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            Ubah latitude dan longitude untuk menggeser titik. Radius dipakai sebagai batas absen karyawan kantor.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onUseIslamicRayaPoint} className="w-full sm:w-auto">
            Titik Islamic Raya
          </Button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            Cek Maps
          </a>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          name="is_active"
          checked={form.is_active}
          onChange={onChange}
          className="mt-1 h-4 w-4 accent-blue-600"
        />
        <span>
          <span className="block text-sm font-bold text-slate-800">Lokasi aktif</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Lokasi aktif dapat dipakai sebagai geofence oleh mobile app.
          </span>
        </span>
      </label>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">Batal</Button>
        <Button type="submit" isLoading={isSaving} className="w-full sm:w-auto">Simpan Lokasi</Button>
      </div>
    </form>
  );
}

function FormField({ label, name, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        value={value ?? ''}
        type={type}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </label>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-800">{value || '-'}</p>
    </div>
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

function averageRadius(offices) {
  if (!offices.length) return 0;
  const total = offices.reduce((sum, office) => sum + Number(office.radius_meters || 0), 0);
  return Math.round(total / offices.length);
}
