import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Eye,
  FileText,
  Search,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getEmployees, getWorklogs } from '@/lib/api/client';

const today = new Date();
const defaultTo = toDateInput(today);
const defaultFrom = toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7));

export default function WorklogPage() {
  const [worklogs, setWorklogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({
    total_entries: 0,
    total_minutes: 0,
    active_employees: 0,
    project_count: 0,
    average_minutes: 0,
  });
  const [filters, setFilters] = useState({
    from: defaultFrom,
    to: defaultTo,
    employee_id: '',
    project: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorklog, setSelectedWorklog] = useState(null);

  const loadData = async () => {
    setIsLoading(true);

    try {
      const [worklogData, employeeData] = await Promise.all([
        getWorklogs(filters),
        getEmployees(),
      ]);

      setWorklogs(worklogData.worklogs || []);
      setProjects(worklogData.projects || []);
      setSummary(worklogData.summary || summary);
      setEmployees((employeeData.employees || []).filter((employee) => employee.role !== 'admin'));
      setMessage(worklogData.fallbackReason || `Sumber data worklog: ${worklogData.source || 'backend'}.`);
    } catch (err) {
      setMessage(`Gagal memuat worklog. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.employee_id, filters.project]);

  const filteredWorklogs = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return worklogs.filter((row) => !keyword || [
      row.employee_name,
      row.employee_email,
      row.department,
      row.position,
      row.project_name,
      row.task_name,
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [worklogs, searchQuery]);

  const projectSummary = useMemo(() => {
    const result = new Map();

    filteredWorklogs.forEach((row) => {
      const current = result.get(row.project_name) || {
        project_name: row.project_name,
        project_color: row.project_color,
        entries: 0,
        minutes: 0,
      };

      current.entries += 1;
      current.minutes += Number(row.duration_minutes || 0);
      result.set(row.project_name, current);
    });

    return [...result.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  }, [filteredWorklogs]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorklogStat title="Total Entri" value={summary.total_entries} icon={FileText} tone="blue" />
        <WorklogStat title="Total Durasi" value={formatDuration(summary.total_minutes)} icon={Clock3} tone="emerald" />
        <WorklogStat title="Karyawan Aktif" value={summary.active_employees} icon={UsersRound} tone="violet" />
        <WorklogStat title="Rata-rata" value={formatDuration(summary.average_minutes)} icon={BarChart3} tone="amber" />
      </section>

      <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 lg:px-5">
            <h3 className="text-lg font-bold text-slate-900">Aktivitas Worklog</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Pantau catatan pekerjaan harian yang dikirim dari aplikasi mobile.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[minmax(200px,1fr)_142px_142px_minmax(170px,200px)_minmax(150px,180px)] lg:px-5">
            <label className="flex h-10 min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 sm:col-span-2 lg:col-span-4 2xl:col-span-1">
              <Search size={17} />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari task, project, karyawan..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
              />
            </label>

            <DateField value={filters.from} onChange={(value) => handleFilterChange('from', value)} />
            <DateField value={filters.to} onChange={(value) => handleFilterChange('to', value)} />

            <select
              value={filters.employee_id}
              onChange={(event) => handleFilterChange('employee_id', event.target.value)}
              className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:col-span-1 lg:col-span-2 2xl:col-span-1"
            >
              <option value="">Semua karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name}</option>
              ))}
            </select>

            <select
              value={filters.project}
              onChange={(event) => handleFilterChange('project', event.target.value)}
              className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:col-span-1 lg:col-span-2 2xl:col-span-1"
            >
              <option value="">Semua project</option>
              {projects.map((project) => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>

          {message && (
            <div className="mx-4 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 lg:mx-5">
              {message}
            </div>
          )}

          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Karyawan</th>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-5 py-3">Waktu</th>
                  <th className="px-5 py-3">Durasi</th>
                  <th className="px-5 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">Memuat worklog...</td>
                  </tr>
                ) : filteredWorklogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-10 text-center text-slate-500">Worklog tidak ditemukan.</td>
                  </tr>
                ) : (
                  filteredWorklogs.map((row) => (
                    <WorklogRow key={row.id} row={row} onOpen={setSelectedWorklog} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:hidden">
            {isLoading ? (
              <EmptyState text="Memuat worklog..." />
            ) : filteredWorklogs.length === 0 ? (
              <EmptyState text="Worklog tidak ditemukan." />
            ) : (
              filteredWorklogs.map((row) => (
                <WorklogCard key={row.id} row={row} onOpen={setSelectedWorklog} />
              ))
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm 2xl:sticky 2xl:top-20 2xl:self-start">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900">Ringkasan Project</h3>
            <p className="mt-1 text-sm text-slate-500">Project dengan durasi terbesar pada filter saat ini.</p>
          </div>

          <div className="space-y-3">
            {projectSummary.length === 0 ? (
              <EmptyState text="Belum ada data project." />
            ) : (
              projectSummary.map((project) => (
                <ProjectSummaryItem key={project.project_name} project={project} totalMinutes={summary.total_minutes} />
              ))
            )}
          </div>
        </aside>
      </section>

      <Modal
        isOpen={Boolean(selectedWorklog)}
        onClose={() => setSelectedWorklog(null)}
        title="Detail Worklog"
        size="lg"
      >
        {selectedWorklog && <WorklogDetail row={selectedWorklog} />}
      </Modal>
    </div>
  );
}

function WorklogStat({ title, value, icon: Icon, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-100 bg-violet-50 text-violet-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
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

function DateField({ value, onChange }) {
  return (
    <label className="relative min-w-0">
      <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function WorklogRow({ row, onOpen }) {
  return (
    <tr className="hover:bg-blue-50/40">
      <td className="px-5 py-3">
        <p className="font-bold text-slate-900">{row.employee_name}</p>
        <p className="mt-1 text-xs text-slate-500">{row.department}</p>
      </td>
      <td className="px-5 py-3 font-medium text-slate-700">{formatDate(row.date)}</td>
      <td className="px-5 py-3"><ProjectPill row={row} /></td>
      <td className="px-5 py-3">
        <p className="line-clamp-2 max-w-md font-medium text-slate-700">{row.task_name}</p>
      </td>
      <td className="px-5 py-3 font-medium text-slate-700">{formatTimeRange(row)}</td>
      <td className="px-5 py-3 font-bold text-slate-900">{formatDuration(row.duration_minutes)}</td>
      <td className="px-5 py-3 text-right">
        <button
          onClick={() => onOpen(row)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  );
}

function WorklogCard({ row, onOpen }) {
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-slate-900">{row.employee_name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{formatDate(row.date)} - {formatTimeRange(row)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-100">
          {formatDuration(row.duration_minutes)}
        </span>
      </div>

      <div className="mt-3 min-w-0">
        <ProjectPill row={row} />
      </div>

      <p className="mt-3 line-clamp-3 min-h-[72px] text-sm font-medium leading-6 text-slate-700">{row.task_name}</p>

      <Button type="button" variant="secondary" onClick={() => onOpen(row)} className="mt-auto w-full gap-2">
        <Eye size={15} />
        Lihat Detail
      </Button>
    </article>
  );
}

function ProjectPill({ row }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-100 sm:max-w-[240px]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.project_color }} />
      <span className="truncate">{row.project_name}</span>
    </span>
  );
}

function ProjectSummaryItem({ project, totalMinutes }) {
  const percentage = totalMinutes ? Math.round((project.minutes / totalMinutes) * 100) : 0;

  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.project_color }} />
            <p className="truncate text-sm font-bold text-slate-900">{project.project_name}</p>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500">{project.entries} entri</p>
        </div>
        <p className="shrink-0 text-sm font-bold text-slate-900">{formatDuration(project.minutes)}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: project.project_color }} />
      </div>
    </div>
  );
}

function WorklogDetail({ row }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <ProjectPill row={row} />
        <h4 className="mt-3 text-lg font-bold text-slate-900">{row.task_name}</h4>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailItem label="Karyawan" value={row.employee_name} />
        <DetailItem label="Departemen" value={row.department} />
        <DetailItem label="Tanggal" value={formatDate(row.date)} />
        <DetailItem label="Durasi" value={formatDuration(row.duration_minutes)} />
        <DetailItem label="Mulai" value={formatTime(row.start_time)} />
        <DetailItem label="Selesai" value={formatTime(row.end_time)} />
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value || '-'}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
      {text}
    </div>
  );
}

function formatDuration(minutesValue) {
  const minutes = Number(minutesValue || 0);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${remaining}m`;
  if (!remaining) return `${hours}j`;
  return `${hours}j ${remaining}m`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTimeRange(row) {
  return `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`;
}

function toDateInput(value) {
  return value.toISOString().slice(0, 10);
}
