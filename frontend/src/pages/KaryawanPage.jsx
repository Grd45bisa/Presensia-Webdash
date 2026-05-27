import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  updateEmployee,
} from '@/lib/api/client';

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  phone_number: '',
  department: '',
  position: '',
  role: 'employee',
  attendance_mode: 'office',
  office_location_id: '',
  can_attend_outside_office: false,
  face_status: 'not_registered',
};

const attendanceLabels = {
  office: 'Kantor',
  field: 'Lapangan',
  remote: 'Remote',
};

const roleLabels = {
  admin: 'Admin',
  employee: 'Karyawan',
};

export default function KaryawanPage() {
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [sourceInfo, setSourceInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [modalMode, setModalMode] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadEmployees = async () => {
    setIsLoading(true);

    try {
      const data = await getEmployees();
      setEmployees(data.employees || []);
      setOffices(data.offices || []);
      setSourceInfo(data.fallbackReason || `Sumber data karyawan: ${data.source || 'backend'}.`);
      setMessage('');
    } catch (err) {
      setMessage(`Gagal mengambil data karyawan. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = !keyword || [
        employee.full_name,
        employee.email,
        employee.department,
        employee.position,
        employee.office_location_name,
      ].some((value) => String(value || '').toLowerCase().includes(keyword));

      const matchesMode = modeFilter === 'all' || employee.attendance_mode === modeFilter;
      const matchesRole = roleFilter === 'all' || employee.role === roleFilter;

      return matchesSearch && matchesMode && matchesRole;
    });
  }, [employees, searchQuery, modeFilter, roleFilter]);

  const stats = useMemo(() => {
    const employeeOnly = employees.filter((employee) => employee.role === 'employee');

    return {
      total: employees.length,
      office: employeeOnly.filter((employee) => employee.attendance_mode === 'office').length,
      field: employeeOnly.filter((employee) => employee.attendance_mode === 'field').length,
      remote: employeeOnly.filter((employee) => employee.attendance_mode === 'remote').length,
    };
  }, [employees]);

  const openCreateModal = () => {
    setSelectedEmployee(null);
    setForm(emptyForm);
    setModalMode('create');
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setForm({
      ...emptyForm,
      ...employee,
      password: '',
      office_location_id: employee.office_location_id || '',
      can_attend_outside_office: Boolean(employee.can_attend_outside_office),
      face_status: employee.face_status || 'not_registered',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedEmployee(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');

    try {
      const payload = {
        ...form,
        office_location_id: form.attendance_mode === 'remote' ? null : form.office_location_id,
      };
      delete payload.face_status;
      delete payload.password;

      if (modalMode === 'create') {
        const created = await createEmployee(payload);
        setEmployees((current) => [created, ...current]);
        setMessage('Karyawan berhasil ditambahkan.');
      } else {
        const updated = await updateEmployee(selectedEmployee.id, payload);
        setEmployees((current) => current.map((employee) => (
          employee.id === selectedEmployee.id ? updated : employee
        )));
        setMessage('Data karyawan berhasil diperbarui.');
      }

      closeModal();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(`Hapus akun ${employee.full_name}?`);
    if (!confirmed) return;

    try {
      await deleteEmployee(employee.id);
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setMessage('Karyawan berhasil dihapus.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <EmployeeStat title="Total User" value={stats.total} tone="blue" />
        <EmployeeStat title="Mode Kantor" value={stats.office} tone="emerald" />
        <EmployeeStat title="Lapangan" value={stats.field} tone="amber" />
        <EmployeeStat title="Remote" value={stats.remote} tone="violet" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Manajemen Karyawan</h3>
            <p className="mt-1 text-sm text-slate-500">{sourceInfo}</p>
          </div>

          <Button onClick={openCreateModal} className="gap-2">
            <Plus size={16} />
            Tambah Karyawan
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center">
          <label className="flex h-10 flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500">
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama, email, departemen, posisi..."
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            />
          </label>

          <div className="flex gap-2">
            <FilterSelect value={modeFilter} onChange={setModeFilter}>
              <option value="all">Semua tipe</option>
              <option value="office">Kantor</option>
              <option value="field">Lapangan</option>
              <option value="remote">Remote</option>
            </FilterSelect>

            <FilterSelect value={roleFilter} onChange={setRoleFilter}>
              <option value="all">Semua role</option>
              <option value="admin">Admin</option>
              <option value="employee">Karyawan</option>
            </FilterSelect>
          </div>
        </div>

        {message && (
          <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-5 py-3">Karyawan</th>
                <th className="px-5 py-3">Departemen</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Tipe Presensi</th>
                <th className="px-5 py-3">Lokasi Kantor</th>
                <th className="px-5 py-3">Device</th>
                <th className="px-5 py-3">Wajah</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                    Memuat data karyawan...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-5 py-10 text-center text-slate-500">
                    Tidak ada karyawan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <EmployeeRow
                    key={employee.id}
                    employee={employee}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-sm font-medium text-slate-500">
          Menampilkan {filteredEmployees.length} dari {employees.length} karyawan
        </div>
      </section>

      <Modal
        isOpen={Boolean(modalMode)}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Tambah Karyawan' : 'Edit Karyawan'}
        size="lg"
      >
        <EmployeeForm
          form={form}
          offices={offices}
          mode={modalMode}
          isSaving={isSaving}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}

function EmployeeStat({ title, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
  };

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function FilterSelect({ value, onChange, children }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600">
      <SlidersHorizontal size={16} className="text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function EmployeeRow({ employee, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-blue-50/40">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <UserRound size={19} />
          </div>
          <div>
            <p className="font-bold text-slate-900">{employee.full_name}</p>
            <p className="text-xs font-medium text-slate-500">{employee.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="font-semibold text-slate-800">{employee.department || '-'}</p>
        <p className="text-xs text-slate-500">{employee.position || '-'}</p>
      </td>
      <td className="px-5 py-3">
        <Badge type={employee.role}>{roleLabels[employee.role] || employee.role}</Badge>
      </td>
      <td className="px-5 py-3">
        <Badge type={employee.attendance_mode}>
          {attendanceLabels[employee.attendance_mode] || employee.attendance_mode}
        </Badge>
      </td>
      <td className="px-5 py-3 font-medium text-slate-700">
        {employee.office_location_name || 'Tidak wajib kantor'}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          {employee.active_device_id ? (
            <CheckCircle2 size={17} className="text-emerald-600" />
          ) : (
            <XCircle size={17} className="text-slate-400" />
          )}
          <span className="text-sm font-medium text-slate-700">
            {employee.active_device_id || 'Belum binding'}
          </span>
        </div>
      </td>
      <td className="px-5 py-3">
        <Badge type={employee.face_status === 'registered' ? 'registered' : 'not_registered'}>
          {employee.face_status === 'registered' ? 'Terdaftar' : 'Belum'}
        </Badge>
      </td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(employee)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={() => onDelete(employee)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmployeeForm({ form, offices, mode, isSaving, onChange, onSubmit, onCancel }) {
  const showOffice = form.attendance_mode !== 'remote';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Nama lengkap" name="full_name" value={form.full_name} onChange={onChange} required />
        <FormField label="Email" name="email" type="email" value={form.email} onChange={onChange} required disabled={mode === 'edit'} />
        {mode === 'create' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 md:col-span-2">
            <p className="text-sm font-bold text-blue-900">Akun dibuat tanpa password karyawan</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">
              Karyawan masuk ke aplikasi Presensia melalui QR Login yang dibuat admin dari dashboard.
            </p>
          </div>
        )}
        <FormField label="Nomor telepon" name="phone_number" value={form.phone_number} onChange={onChange} />
        <FormField label="Departemen" name="department" value={form.department} onChange={onChange} />
        <FormField label="Posisi" name="position" value={form.position} onChange={onChange} />

        <SelectField label="Role" name="role" value={form.role} onChange={onChange}>
          <option value="employee">Karyawan</option>
          <option value="admin">Admin</option>
        </SelectField>

        <SelectField label="Tipe presensi" name="attendance_mode" value={form.attendance_mode} onChange={onChange}>
          <option value="office">Kantor</option>
          <option value="field">Lapangan</option>
          <option value="remote">Remote</option>
        </SelectField>

        {showOffice && (
          <SelectField label="Lokasi kantor" name="office_location_id" value={form.office_location_id} onChange={onChange}>
            <option value="">Pilih lokasi</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </SelectField>
        )}

        <FaceStatusInfo status={form.face_status} mode={mode} />
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          name="can_attend_outside_office"
          checked={form.can_attend_outside_office}
          onChange={onChange}
          className="mt-1 h-4 w-4 accent-blue-600"
        />
        <span>
          <span className="block text-sm font-bold text-slate-800">Boleh presensi di luar kantor</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Aktifkan untuk karyawan lapangan atau remote yang tidak selalu berada dalam radius kantor.
          </span>
        </span>
      </label>

      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {mode === 'create' ? 'Tambah Karyawan' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}

function FaceStatusInfo({ status, mode }) {
  const isRegistered = status === 'registered';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="mb-2 block text-xs font-bold text-slate-600">Status wajah</span>
      <div className="flex flex-wrap items-center gap-2">
        <Badge type={isRegistered ? 'registered' : 'not_registered'}>
          {isRegistered ? 'Terdaftar' : 'Belum terdaftar'}
        </Badge>
        <span className="text-xs font-semibold text-slate-500">
          {mode === 'create' ? 'Akan diisi dari aplikasi karyawan' : 'Dibaca dari data registrasi wajah'}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Admin hanya mengecek status. Registrasi wajah dilakukan oleh karyawan dari aplikasi Presensia.
      </p>
    </div>
  );
}

function FormField({ label, name, value, onChange, type = 'text', ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <input
        name={name}
        value={value || ''}
        type={type}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
        {...props}
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}
