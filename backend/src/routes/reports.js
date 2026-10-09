const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const employeeMockStore = require('../lib/employeeMockStore');
const attendanceMockStore = require('../lib/attendanceMockStore');
const worklogMockStore = require('../lib/worklogMockStore');
const { generateEmployeeReportWorkbook, formatMinutes } = require('../services/employeeExcel.service');

const router = express.Router();

function normalizeSupabaseRecord(row) {
  const profile = row.profiles || {};
  const office = row.office_locations || {};

  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: profile.full_name || 'Tanpa Nama',
    employee_email: profile.email || '',
    department: profile.department || '',
    position: profile.position || '',
    attendance_mode: profile.attendance_mode || 'office',
    office_location_name: office.name || null,
    date: row.date,
    check_in: row.check_in,
    check_out: row.check_out,
    is_mock_location: Boolean(row.is_mock_location),
    geofence_status: row.geofence_status || 'not_checked',
    distance_from_office_meters: row.distance_from_office_meters,
    face_similarity: row.face_similarity,
    schedule_status: row.schedule_status,
    late_minutes: row.late_minutes,
    status: row.status || 'present',
    source: row.source || 'manual',
  };
}

function getReportStatus(row) {
  if (row.is_mock_location) return 'fake_gps';
  if (row.geofence_status === 'outside') return 'outside';
  if (row.status === 'late' || row.status === 'terlambat') return 'late';
  return 'present';
}

function applyFilters(records, filters) {
  const keyword = String(filters.search || '').trim().toLowerCase();

  return records
    .filter((row) => !filters.from || row.date >= filters.from)
    .filter((row) => !filters.to || row.date <= filters.to)
    .filter((row) => !filters.department || row.department === filters.department)
    .filter((row) => !filters.status || getReportStatus(row) === filters.status)
    .filter((row) => !keyword || [
      row.employee_name,
      row.employee_email,
      row.department,
      row.position,
      row.office_location_name,
      row.attendance_mode,
    ].some((value) => String(value || '').toLowerCase().includes(keyword)));
}

function buildSummary(records) {
  return {
    total: records.length,
    employees: new Set(records.map((row) => row.employee_id)).size,
    present: records.filter((row) => getReportStatus(row) === 'present').length,
    late: records.filter((row) => getReportStatus(row) === 'late').length,
    outside: records.filter((row) => row.geofence_status === 'outside').length,
    fake_gps: records.filter((row) => row.is_mock_location).length,
    not_checkout: records.filter((row) => !row.check_out).length,
  };
}

function listDepartments(records) {
  return [...new Set(records.map((row) => row.department).filter(Boolean))].sort();
}

async function listSupabaseRecords(filters) {
  let query = supabaseAdmin
    .from('attendance_records')
    .select(`
      id,
      employee_id,
      date,
      source,
      status,
      check_in,
      check_out,
      is_mock_location,
      geofence_status,
      distance_from_office_meters,
      face_similarity,
      schedule_status,
      late_minutes,
      profiles:employee_id (
        full_name,
        email,
        department,
        position,
        attendance_mode
      ),
      office_locations:office_location_id (
        name
      )
    `);

  if (filters.from) query = query.gte('date', filters.from);
  if (filters.to) query = query.lte('date', filters.to);

  const { data, error } = await query
    .order('date', { ascending: false })
    .order('check_in', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeSupabaseRecord);
}

async function getReportRecords(filters) {
  if (!supabaseAdmin) {
    const error = new Error('Supabase backend belum dikonfigurasi.');
    error.statusCode = 503;
    throw error;
  }

  const dateFiltered = await listSupabaseRecords(filters);
  return {
    source: 'supabase',
    allRecords: dateFiltered,
    records: applyFilters(dateFiltered, filters),
  };
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function formatCsvTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatWorkDuration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return '';
  const diffMinutes = Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours <= 0) return `${minutes} menit`;
  if (minutes === 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}

function formatLateStatus(row) {
  const lateMinutes = Number(row.late_minutes || 0);
  if (row.schedule_status === 'early_leave') return 'Pulang duluan';
  if (row.schedule_status === 'checkout_late_prompt') return 'Lewat jam pulang';
  if (row.schedule_status === 'late' || lateMinutes > 0 || row.status === 'late') {
    return lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Terlambat';
  }

  return 'Tidak terlambat';
}

function toCsv(records) {
  const rows = [
    ['Tanggal', 'Karyawan', 'Email', 'Departemen', 'Posisi', 'Check-in', 'Check-out', 'Jam Kerja', 'Status Telat', 'Tipe Presensi', 'Status Laporan', 'Geofence', 'Fake GPS'],
    ...records.map((row) => [
      row.date,
      row.employee_name,
      row.employee_email,
      row.department,
      row.position,
      formatCsvTime(row.check_in),
      formatCsvTime(row.check_out),
      formatWorkDuration(row.check_in, row.check_out),
      formatLateStatus(row),
      row.attendance_mode,
      getReportStatus(row),
      row.geofence_status,
      row.is_mock_location ? 'Ya' : 'Tidak',
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

router.get('/attendance', async (req, res) => {
  const filters = {
    from: req.query.from,
    to: req.query.to,
    department: req.query.department,
    status: req.query.status,
    search: req.query.search,
  };

  let result;
  try {
    result = await getReportRecords(filters);
  } catch (err) {
    console.error('[Reports Attendance Error]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Gagal membaca laporan presensi dari Supabase.',
    });
  }

  return res.json({
    success: true,
    data: {
      source: result.source,
      fallbackReason: result.fallbackReason,
      records: result.records,
      summary: buildSummary(result.records),
      departments: listDepartments(result.allRecords),
      filters,
    },
  });
});

router.get('/attendance/export.csv', async (req, res) => {
  const filters = {
    from: req.query.from,
    to: req.query.to,
    department: req.query.department,
    status: req.query.status,
    search: req.query.search,
  };

  let result;
  try {
    result = await getReportRecords(filters);
  } catch (err) {
    console.error('[Reports Attendance Export Error]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Gagal membaca laporan presensi dari Supabase.',
    });
  }
  const filename = `Laporan_Presensi_${filters.from || 'awal'}_${filters.to || 'akhir'}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(toCsv(result.records));
});

// ============================================================================
// LAPORAN PERORANGAN (PRESENSI HARIAN + TRACKER WORKLOG + EXPORT EXCEL)
// ============================================================================

function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

function formatTimeOnly(timestamp) {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

async function getSignedPhotoUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!supabaseAdmin) return null;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('attendance-evidence')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

async function fetchEmployee(employeeId) {
  if (employeeId === 'all') {
    return {
      id: 'all',
      full_name: 'Semua Akun (Seluruh Pengguna)',
      email: '-',
      department: 'Seluruh Departemen',
      position: 'Semua Jabatan',
      employee_code: 'ALL',
    };
  }

  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, department, position, role')
        .eq('id', employeeId)
        .maybeSingle();
      if (data) return data;
    } catch (e) {
      console.warn('[Reports] Failed fetching employee from Supabase:', e.message);
    }
  }

  const mocks = employeeMockStore.listEmployees();
  return mocks.find((e) => e.id === employeeId) || {
    id: employeeId,
    full_name: 'Karyawan',
    email: '',
    department: '-',
    position: '-',
  };
}

async function fetchAttendance(employeeId, from, to) {
  if (supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from('attendance_records')
        .select(`
          id,
          employee_id,
          date,
          check_in,
          check_out,
          status,
          late_minutes,
          schedule_status,
          is_mock_location,
          geofence_status,
          evidence_photo_path,
          evidence_photo_in_path,
          evidence_photo_out_path,
          profiles:employee_id (
            id,
            full_name,
            department,
            position
          )
        `);

      if (employeeId && employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);

      const { data, error } = await query.order('date', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('[Reports] Failed fetching attendance from Supabase:', e.message);
    }
  }

  const mocks = attendanceMockStore.listAttendance();
  return mocks.filter((rec) => {
    if (employeeId && employeeId !== 'all' && rec.employee_id !== employeeId) return false;
    if (from && rec.date < from) return false;
    if (to && rec.date > to) return false;
    return true;
  });
}

async function fetchWorklogs(employeeId, from, to) {
  if (supabaseAdmin) {
    try {
      let query = supabaseAdmin
        .from('worklog_entries')
        .select(`
          id,
          employee_id,
          date,
          task_name,
          project_name,
          project_color,
          start_time,
          end_time,
          profiles:employee_id (
            id,
            full_name,
            department,
            position
          )
        `);

      if (employeeId && employeeId !== 'all') {
        query = query.eq('employee_id', employeeId);
      }
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);

      const { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('[Reports] Failed fetching worklogs from Supabase:', e.message);
    }
  }

  return worklogMockStore.listWorklogs({ from, to, employeeId: employeeId === 'all' ? '' : employeeId });
}

async function getEmployeeDailyReportData({ employeeId, from, to }) {
  const isAll = employeeId === 'all';
  const [employee, attendances, worklogs] = await Promise.all([
    fetchEmployee(employeeId),
    fetchAttendance(employeeId, from, to),
    fetchWorklogs(employeeId, from, to),
  ]);

  const attendanceByKey = new Map();
  attendances.forEach((att) => {
    const key = isAll ? `${att.date}___${att.employee_id}` : att.date;
    attendanceByKey.set(key, att);
  });

  const worklogsByKey = new Map();
  worklogs.forEach((w) => {
    const key = isAll ? `${w.date}___${w.employee_id}` : w.date;
    if (!worklogsByKey.has(key)) {
      worklogsByKey.set(key, []);
    }
    worklogsByKey.get(key).push(w);
  });

  let allKeys = [];
  if (!isAll && from && to) {
    const dates = [];
    const curr = new Date(`${from}T00:00:00+07:00`);
    const last = new Date(`${to}T00:00:00+07:00`);
    while (curr <= last) {
      dates.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
    allKeys = Array.from(new Set([...dates, ...attendanceByKey.keys(), ...worklogsByKey.keys()])).sort();
  } else {
    allKeys = Array.from(new Set([...attendanceByKey.keys(), ...worklogsByKey.keys()])).sort();
  }

  let totalWorkMinutes = 0;
  let totalTaskMinutes = 0;
  let totalTasks = 0;
  let presentDays = 0;

  const dailyRecords = [];

  for (const key of allKeys) {
    const att = attendanceByKey.get(key);
    const tasksRaw = worklogsByKey.get(key) || [];
    const date = isAll ? key.split('___')[0] : key;

    const profile = att?.profiles || (tasksRaw[0] && tasksRaw[0].profiles) || employee;
    const employeeName = profile?.full_name || att?.employee_name || employee?.full_name || 'Karyawan';

    let checkInTime = '';
    let checkOutTime = '';
    let workDurationMinutes = 0;
    let photoInUrl = null;
    let photoOutUrl = null;
    let statusLabel = 'Belum Absen';
    let isAutoCheckOut = false;

    // Check date context (weekend / past / today)
    const dayDate = new Date(`${date}T00:00:00+07:00`);
    const dayOfWeek = dayDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const todayWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const isPast = date < todayWib;

    if (att) {
      if (att.check_in) {
        presentDays++;
        checkInTime = formatTimeOnly(att.check_in);
      }
      if (att.check_out) {
        checkOutTime = formatTimeOnly(att.check_out);
      }

      // ATURAN JAM PULANG KANTOR:
      // Jika karyawan absen masuk tetapi tidak absen pulang (check_out kosong)
      if (att.check_in && !att.check_out) {
        if (date < todayWib) {
          isAutoCheckOut = true;
          checkOutTime = '17.00'; // Default jam pulang kantor

          try {
            // Hitung jam kerja dari waktu check_in sampai 17:00:00 WIB pada tanggal tersebut
            const officeEndTime = new Date(`${date}T17:00:00+07:00`);
            const checkInDate = new Date(att.check_in);
            const diff = Math.round((officeEndTime - checkInDate) / 60000);
            workDurationMinutes = Math.max(0, diff);
            totalWorkMinutes += workDurationMinutes;
          } catch {
            workDurationMinutes = 0;
          }
        }
      } else if (att.check_in && att.check_out) {
        const diff = Math.round((new Date(att.check_out) - new Date(att.check_in)) / 60000);
        workDurationMinutes = Math.max(0, diff);
        totalWorkMinutes += workDurationMinutes;
      }

      const photoInPath = att.evidence_photo_in_path || att.evidence_photo_path || att.evidence_photo_url;
      const photoOutPath = att.evidence_photo_out_path || att.evidence_photo_out_url;

      photoInUrl = await getSignedPhotoUrl(photoInPath);
      photoOutUrl = await getSignedPhotoUrl(photoOutPath);

      if (att.is_mock_location) {
        statusLabel = 'Fake GPS';
      } else if (att.geofence_status === 'outside') {
        statusLabel = 'Luar Geofence';
      } else if (att.status === 'leave') {
        statusLabel = 'Izin';
      } else if (att.status === 'sick') {
        statusLabel = 'Sakit';
      } else if (att.status === 'holiday') {
        statusLabel = 'Libur';
      } else if (att.late_minutes > 0 || att.status === 'late') {
        statusLabel = `Terlambat (${att.late_minutes || 0} mnt)`;
      } else if (att.check_in) {
        statusLabel = 'Hadir';
      } else {
        statusLabel = isPast ? 'Tidak Hadir / Alpa' : 'Belum Absen';
      }
    } else {
      // Tidak ada log presensi pada tanggal ini
      checkInTime = '-';
      checkOutTime = '-';
      workDurationMinutes = 0;
      if (isWeekend) {
        statusLabel = 'Libur';
      } else if (isPast) {
        statusLabel = 'Tidak Hadir / Alpa';
      } else if (date === todayWib) {
        statusLabel = 'Belum Absen';
      } else {
        statusLabel = 'Mendatang';
      }
    }

    const tasks = tasksRaw.map((task) => {
      const startFmt = formatTimeOnly(task.start_time);
      const endFmt = formatTimeOnly(task.end_time);
      let durationMinutes = 0;
      if (task.start_time && task.end_time) {
        durationMinutes = Math.max(0, Math.round((new Date(task.end_time) - new Date(task.start_time)) / 60000));
      } else if (task.duration_minutes) {
        durationMinutes = Number(task.duration_minutes);
      }

      totalTaskMinutes += durationMinutes;
      totalTasks++;

      return {
        id: task.id,
        task_name: task.task_name,
        project_name: task.project_name || '-',
        start_time: startFmt,
        end_time: endFmt,
        time_range: startFmt && endFmt ? `${startFmt} - ${endFmt}` : (startFmt || '-'),
        duration_minutes: durationMinutes,
      };
    });

    dailyRecords.push({
      date,
      date_formatted: formatIndonesianDate(date),
      employee_name: employeeName,
      check_in: att?.check_in || null,
      check_in_time: checkInTime,
      check_out: att?.check_out || null,
      check_out_time: checkOutTime,
      is_auto_checkout: isAutoCheckOut,
      work_duration_minutes: workDurationMinutes,
      photo_in_url: photoInUrl,
      photo_out_url: photoOutUrl,
      attendance_status: att?.status || 'absent',
      late_minutes: att?.late_minutes || 0,
      status_label: statusLabel,
      tasks,
    });
  }

  if (isAll) {
    dailyRecords.sort((a, b) => {
      const cmpDate = a.date.localeCompare(b.date);
      if (cmpDate !== 0) return cmpDate;
      return (a.employee_name || '').localeCompare(b.employee_name || '');
    });
  }

  const allDatesList = Array.from(new Set(dailyRecords.map((r) => r.date))).sort();

  return {
    isAll,
    employee,
    period: {
      from: from || (allDatesList[0] || '-'),
      to: to || (allDatesList[allDatesList.length - 1] || '-'),
    },
    summary: {
      total_days: allDatesList.length,
      present_days: presentDays,
      total_work_minutes: totalWorkMinutes,
      total_tasks: totalTasks,
      total_task_minutes: totalTaskMinutes,
    },
    dailyRecords,
  };
}

router.get('/employee-daily', async (req, res) => {
  const { employee_id, from, to } = req.query;
  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'Parameter employee_id wajib diisi.' });
  }

  try {
    const reportData = await getEmployeeDailyReportData({ employeeId: employee_id, from, to });
    return res.json({ success: true, data: reportData });
  } catch (err) {
    console.error('[Employee Daily Report Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal memproses data laporan.' });
  }
});

router.get('/employee-daily-export', async (req, res) => {
  const { employee_id, from, to } = req.query;
  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'Parameter employee_id wajib diisi.' });
  }

  try {
    const reportData = await getEmployeeDailyReportData({ employeeId: employee_id, from, to });
    const workbook = await generateEmployeeReportWorkbook(reportData);

    const safeName = String(reportData.employee.full_name || 'Karyawan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Laporan_Kerja_${safeName}_${from || 'awal'}_${to || 'akhir'}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('[Employee Daily Export Error]', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal membuat file export Excel.' });
  }
});

module.exports = router;
