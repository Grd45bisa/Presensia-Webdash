import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  RefreshCw,
  User,
  Users,
  Clock,
  Briefcase,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  getEmployees,
  getEmployeeDailyReport,
  exportEmployeeDailyReportXlsx,
} from '@/lib/api/client';

function toDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMinutesText(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0 Menit';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours <= 0) return `${mins} Menit`;
  if (mins === 0) return `${hours} Jam`;
  return `${hours} Jam ${mins} Menit`;
}

export default function EmployeeDailyReportTab() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [photoModal, setPhotoModal] = useState({ isOpen: false, url: '', title: '' });

  // 1. Load ALL employees on mount (DO NOT filter out admins)
  useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await getEmployees();
        const list = res.employees || [];
        setEmployees(list);
      } catch (err) {
        setMessage(`Gagal memuat daftar akun: ${err.message}`);
      }
    }
    loadEmployees();
  }, []);

  // 2. Fetch report data whenever employee or date range changes
  const fetchReport = async () => {
    if (!selectedEmployeeId) return;
    setIsLoading(true);
    setMessage('');
    try {
      const res = await getEmployeeDailyReport({
        employee_id: selectedEmployeeId,
        from: dateRange.from,
        to: dateRange.to,
      });
      const data = res?.dailyRecords ? res : (res?.data || null);
      if (data) {
        setReportData(data);
      } else {
        setMessage('Gagal memuat laporan.');
      }
    } catch (err) {
      setMessage(`Gagal memuat data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchReport();
    }
  }, [selectedEmployeeId, dateRange.from, dateRange.to]);

  // 3. Handle export to Excel (.xlsx)
  const handleExportExcel = async () => {
    if (!selectedEmployeeId) return;
    setIsExporting(true);
    try {
      const blob = await exportEmployeeDailyReportXlsx({
        employee_id: selectedEmployeeId,
        from: dateRange.from,
        to: dateRange.to,
      });

      const employeeName = selectedEmployeeId === 'all'
        ? 'Semua_Akun'
        : (reportData?.employee?.full_name || 'Karyawan');
      const safeName = employeeName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Laporan_Kerja_${safeName}_${dateRange.from}_${dateRange.to}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage(`Gagal mengunduh file Excel: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Quick preset dates
  const setPreset = (type) => {
    const now = new Date();
    if (type === 'all') {
      setDateRange({ from: '', to: '' });
    } else if (type === '7days') {
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      setDateRange({ from: toDateInput(past), to: toDateInput(now) });
    } else if (type === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRange({ from: toDateInput(first), to: toDateInput(now) });
    } else if (type === 'prevMonth') {
      const firstPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateRange({ from: toDateInput(firstPrev), to: toDateInput(lastPrev) });
    }
  };

  const isAll = reportData?.isAll || selectedEmployeeId === 'all';
  const employee = reportData?.employee;
  const summary = reportData?.summary;
  const dailyRecords = reportData?.dailyRecords || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ERROR / STATUS MESSAGE */}
      {message && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm font-medium transition-all shadow-xs">
          <AlertTriangle size={18} className="shrink-0 text-amber-600" />
          <span>{message}</span>
        </div>
      )}

      {/* FILTER & ACTION TOOLBAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Controls Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* 1. Pilih Akun / Karyawan */}
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pilih Akun / Karyawan ({employees.length} Akun Terdaftar)
            </label>
            <div className="relative">
              <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-11 pl-9 pr-8 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 cursor-pointer"
              >
                <option value="all">Semua Akun (Seluruh Pengguna)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.role === 'admin' ? '(Admin)' : ''} {emp.department ? `[${emp.department}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Rentang Tanggal (2 Kolom Responsif) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Dari Tanggal
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="w-full h-11 pl-9 pr-3 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 text-slate-700 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Sampai Tanggal
              </label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="w-full h-11 pl-9 pr-3 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 text-slate-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. Action Buttons */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={fetchReport}
              disabled={isLoading}
              className="h-11 px-3 sm:px-4 gap-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 shrink-0"
              title="Muat Ulang Data"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <Button
              onClick={handleExportExcel}
              disabled={isExporting || isLoading || dailyRecords.length === 0}
              className="flex-1 h-11 px-3 sm:px-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all text-xs sm:text-sm truncate justify-center"
            >
              <FileSpreadsheet size={16} className="shrink-0" />
              <span className="truncate">{isExporting ? 'Mengekspor...' : 'Unduh Excel (.xlsx)'}</span>
            </Button>
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-slate-400 font-medium mr-1">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => setPreset('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                !dateRange.from && !dateRange.to
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Semua Riwayat (Tanpa Batas Tanggal)
            </button>
            <button
              type="button"
              onClick={() => setPreset('7days')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setPreset('month')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setPreset('prevMonth')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors"
            >
              Bulan Lalu
            </button>
          </div>

          {(dateRange.from || dateRange.to) && (
            <button
              type="button"
              onClick={() => setPreset('all')}
              className="text-blue-600 hover:text-blue-700 font-semibold underline text-xs ml-auto sm:ml-0"
            >
              Reset ke Semua Data
            </button>
          )}
        </div>
      </div>

      {/* EMPLOYEE INFO & KPI SUMMARY CARDS */}
      {employee && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Card */}
          <div className="md:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {isAll ? <Users size={22} /> : (employee.full_name?.charAt(0)?.toUpperCase() || 'U')}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-base truncate">{employee.full_name}</h3>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {isAll ? `${employees.length} Akun Terdaftar` : `${employee.position || 'Staff'} • ${employee.department || '-'}`}
              </p>
              <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                {isAll ? 'SEMUA AKUN' : (employee.employee_code || (employee.id ? employee.id.slice(0, 8) : '-'))}
              </span>
            </div>
          </div>

          {/* KPI 1: Kehadiran */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Kehadiran</span>
              <p className="text-2xl font-black text-slate-800 mt-1">
                {summary.present_days} <span className="text-xs font-semibold text-slate-400">/ {summary.total_days} Log Hari</span>
              </p>
              <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle2 size={12} /> Hari Tercatat Hadir
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* KPI 2: Total Jam Presensi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jam Kerja</span>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {formatMinutesText(summary.total_work_minutes)}
              </p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-1">
                <Clock size={12} /> Berdasarkan Absen Masuk & Pulang
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={22} />
            </div>
          </div>

          {/* KPI 3: Total Task Tracker */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aktivitas Tracker</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {summary.total_tasks} <span className="text-xs font-semibold text-slate-400">Task</span>
              </p>
              <span className="text-[11px] font-medium text-indigo-600 flex items-center gap-1 mt-1">
                <Briefcase size={12} /> Durasi: {formatMinutesText(summary.total_task_minutes)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase size={22} />
            </div>
          </div>
        </div>
      )}

      {/* TABLE PREVIEW (TERPADU PRESENSI + TRACKER) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Layers size={18} className="text-blue-600" />
              Pratinjau Data Laporan Harian & Aktivitas Tracker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data ini sesuai persis dengan struktur yang akan dicetak ke dalam file Excel (.xlsx).
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
            {dailyRecords.length} Log Baris
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-3 text-center w-12">No</th>
                {isAll && <th className="py-3.5 px-3 min-w-[140px]">Karyawan</th>}
                <th className="py-3.5 px-3 min-w-[150px]">Tanggal</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">Jam Masuk</th>
                <th className="py-3.5 px-3 text-center min-w-[100px]">Foto Masuk</th>
                <th className="py-3.5 px-3 text-center min-w-[90px]">Jam Pulang</th>
                <th className="py-3.5 px-3 text-center min-w-[100px]">Foto Pulang</th>
                <th className="py-3.5 px-3 text-center min-w-[130px] font-black text-blue-700">Total Jam Kerja</th>
                <th className="py-3.5 px-4 min-w-[200px]">Aktivitas / Task Tracker</th>
                <th className="py-3.5 px-3 min-w-[120px]">Project</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">Waktu Tracker</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">Durasi Task</th>
                <th className="py-3.5 px-3 text-center min-w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isAll ? 13 : 12} className="py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Sedang memuat data laporan...</span>
                  </td>
                </tr>
              ) : dailyRecords.length === 0 ? (
                <tr>
                  <td colSpan={isAll ? 13 : 12} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data kehadiran atau tracker pada rentang tanggal ini.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pilihan tanggal atau klik tombol di bawah untuk melihat seluruh data yang ada.</p>
                    <button
                      type="button"
                      onClick={() => setPreset('all')}
                      className="mt-3 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Tampilkan Semua Riwayat Data
                    </button>
                  </td>
                </tr>
              ) : (
                dailyRecords.map((day, dayIndex) => {
                  const tasks = day.tasks && day.tasks.length > 0
                    ? day.tasks
                    : [{ id: 'none', task_name: 'Hanya Presensi (Tidak ada catatan tracker)', project_name: '-', time_range: '-', duration_minutes: 0 }];

                  return tasks.map((task, taskIndex) => {
                    const isFirstTask = taskIndex === 0;

                    return (
                      <tr
                        key={`${day.date}-${day.employee_name || ''}-${task.id || taskIndex}`}
                        className={`hover:bg-slate-50/70 transition-colors ${isFirstTask && dayIndex > 0 ? 'border-t-2 border-slate-200' : ''}`}
                      >
                        {/* NO */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center font-bold text-slate-500 bg-white border-r border-slate-100 align-middle"
                          >
                            {dayIndex + 1}
                          </td>
                        )}

                        {/* KARYAWAN (Hanya saat pilih Semua Akun) */}
                        {isAll && isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 font-bold text-slate-900 bg-white border-r border-slate-100 align-middle"
                          >
                            {day.employee_name}
                          </td>
                        )}

                        {/* TANGGAL */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 font-semibold text-slate-800 bg-white border-r border-slate-100 align-middle"
                          >
                            {day.date_formatted || day.date}
                          </td>
                        )}

                        {/* JAM MASUK */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center font-mono font-bold text-slate-700 bg-white border-r border-slate-100 align-middle"
                          >
                            {day.check_in_time || (
                              <span className="text-slate-400 font-normal italic">Belum Absen</span>
                            )}
                          </td>
                        )}

                        {/* FOTO MASUK */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center bg-white border-r border-slate-100 align-middle"
                          >
                            {day.photo_in_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPhotoModal({
                                    isOpen: true,
                                    url: day.photo_in_url,
                                    title: `Bukti Foto Masuk - ${day.employee_name || ''} (${day.date_formatted || day.date})`,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors border border-blue-200 cursor-pointer"
                              >
                                <Camera size={12} />
                                <span>Lihat Foto</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* JAM PULANG */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center font-mono font-bold text-slate-700 bg-white border-r border-slate-100 align-middle"
                          >
                            {day.check_out_time ? (
                              <span className="font-mono font-bold text-slate-700">{day.check_out_time}</span>
                            ) : day.check_in ? (
                              <span className="text-amber-600 font-medium">Belum Pulang</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* FOTO PULANG */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center bg-white border-r border-slate-100 align-middle"
                          >
                            {day.photo_out_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPhotoModal({
                                    isOpen: true,
                                    url: day.photo_out_url,
                                    title: `Bukti Foto Pulang - ${day.employee_name || ''} (${day.date_formatted || day.date})`,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors border border-indigo-200 cursor-pointer"
                              >
                                <Camera size={12} />
                                <span>Lihat Foto</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* TOTAL JAM KERJA (PRESENSI) */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/40 border-r border-slate-100 align-middle"
                          >
                            {day.work_duration_minutes > 0 ? (
                              <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                                {formatMinutesText(day.work_duration_minutes)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">-</span>
                            )}
                          </td>
                        )}

                        {/* TASK TRACKER */}
                        <td className="py-2.5 px-4 font-medium text-slate-800 border-r border-slate-100">
                          {task.task_name}
                        </td>

                        {/* PROJECT */}
                        <td className="py-2.5 px-3 text-slate-600 font-semibold border-r border-slate-100">
                          {task.project_name || '-'}
                        </td>

                        {/* WAKTU TRACKER */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-100">
                          {task.time_range || '-'}
                        </td>

                        {/* DURASI TASK */}
                        <td className="py-2.5 px-3 text-center font-semibold text-indigo-700 border-r border-slate-100">
                          {task.duration_minutes > 0 ? formatMinutesText(task.duration_minutes) : '-'}
                        </td>

                        {/* STATUS PRESENSI */}
                        {isFirstTask && (
                          <td
                            rowSpan={tasks.length}
                            className="py-3 px-3 text-center bg-white align-middle"
                          >
                            {day.late_minutes > 0 || day.attendance_status === 'late' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                Terlambat ({day.late_minutes || 0} mnt)
                              </span>
                            ) : day.status_label === 'Izin' || day.status_label === 'Sakit' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
                                {day.status_label}
                              </span>
                            ) : day.status_label === 'Libur' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                Libur
                              </span>
                            ) : day.status_label === 'Tidak Hadir / Alpa' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                                Tidak Hadir / Alpa
                              </span>
                            ) : day.check_in ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                Hadir
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                                {day.status_label || 'Tidak Hadir'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  });
                })
              )}
            </tbody>

            {/* TABLE FOOTER SUMMARY */}
            {dailyRecords.length > 0 && summary && (
              <tfoot>
                <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-bold text-slate-800 text-[11px]">
                  <td colSpan={isAll ? 7 : 6} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total Durasi Kerja Presensi :
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-blue-800 text-xs bg-blue-100/60">
                    {formatMinutesText(summary.total_work_minutes)}
                  </td>
                  <td colSpan={3} className="py-3.5 px-4 text-right uppercase tracking-wider text-slate-600">
                    Total Waktu Task Tracker :
                  </td>
                  <td className="py-3.5 px-3 text-center font-black text-indigo-800 text-xs bg-indigo-100/60">
                    {formatMinutesText(summary.total_task_minutes)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* PHOTO PREVIEW MODAL */}
      <Modal
        isOpen={photoModal.isOpen}
        onClose={() => setPhotoModal({ isOpen: false, url: '', title: '' })}
        title={photoModal.title}
        size="md"
      >
        <div className="space-y-4 p-2 text-center">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
            <img
              src={photoModal.url}
              alt={photoModal.title}
              className="max-h-[460px] w-full object-contain mx-auto"
              onError={(e) => {
                e.target.src = 'https://ui-avatars.com/api/?name=Bukti+Foto&background=random';
              }}
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Foto bukti absensi tersimpan aman dan terenkripsi dalam penyimpanan Presensia.
          </p>
        </div>
      </Modal>
    </div>
  );
}
