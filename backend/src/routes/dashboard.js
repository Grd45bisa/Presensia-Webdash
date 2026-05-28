const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');

const router = express.Router();

function formatTime(value) {
  if (!value) return '-';

  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2).replace('.', ',')}%`;
}

function getJakartaDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function mapStatusLabel(row) {
  if (!row.check_out) return 'Belum Check-out';
  return 'Selesai';
}

function mapGeofence(value) {
  if (value === 'inside') return 'inside';
  if (value === 'outside') return 'outside';
  return 'not_checked';
}

function formatWorkDuration(checkIn, checkOut) {
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

function buildLateStatus(row) {
  const lateMinutes = Number(row.late_minutes || 0);
  if (row.schedule_status === 'late' || lateMinutes > 0 || row.status === 'late') {
    return lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Terlambat';
  }

  return 'Tepat waktu';
}

function buildSummaryCards({ totalEmployees, presentCount, outsideCount, fakeGpsCount }) {
  const missingCount = Math.max(totalEmployees - presentCount, 0);
  const presentPercent = totalEmployees ? (presentCount / totalEmployees) * 100 : 0;
  const missingPercent = totalEmployees ? (missingCount / totalEmployees) * 100 : 0;
  const outsidePercent = totalEmployees ? (outsideCount / totalEmployees) * 100 : 0;
  const fakeGpsPercent = totalEmployees ? (fakeGpsCount / totalEmployees) * 100 : 0;

  return [
    {
      title: 'Total Karyawan',
      value: totalEmployees,
      detail: `${totalEmployees} akun aktif`,
      color: 'blue',
      icon: 'users',
    },
    {
      title: 'Hadir Hari Ini',
      value: presentCount,
      detail: `${formatPercent(presentPercent)} dari total`,
      color: 'emerald',
      icon: 'userRoundCheck',
    },
    {
      title: 'Belum Presensi',
      value: missingCount,
      detail: `${formatPercent(missingPercent)} dari total`,
      color: 'amber',
      icon: 'clock',
    },
    {
      title: 'Di Luar Geofence',
      value: outsideCount,
      detail: `${formatPercent(outsidePercent)} perlu ditinjau`,
      color: 'rose',
      icon: 'mapPin',
    },
    {
      title: 'Indikasi Fake GPS',
      value: fakeGpsCount,
      detail: `${formatPercent(fakeGpsPercent)} risiko tinggi`,
      color: 'red',
      icon: 'locateFixed',
    },
  ];
}

async function getSupabaseTrendData(totalEmployees) {
  const todayParts = getJakartaDateParts();
  const firstDay = `${todayParts.year}-${todayParts.month}-01`;
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;
  const dayCount = Number(todayParts.day);

  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .select('date')
    .gte('date', firstDay)
    .lte('date', today);

  if (error) throw error;

  const attendanceByDate = new Map();
  (data || []).forEach((row) => {
    attendanceByDate.set(row.date, (attendanceByDate.get(row.date) || 0) + 1);
  });

  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const dateKey = `${todayParts.year}-${todayParts.month}-${String(day).padStart(2, '0')}`;
    const hadir = attendanceByDate.get(dateKey) || 0;
    const belumPresensi = Math.max((totalEmployees || 0) - hadir, 0);
    const tingkatKehadiran = totalEmployees ? Math.round((hadir / totalEmployees) * 100) : 0;

    return {
      day,
      date: `${String(day).padStart(2, '0')} ${new Date(`${todayParts.year}-${todayParts.month}-01`).toLocaleString('id-ID', { month: 'long' })} ${todayParts.year}`,
      hadir,
      belumPresensi,
      tingkatKehadiran,
    };
  });
}

async function getSupabaseDashboardData() {
  const todayParts = getJakartaDateParts();
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;

  const { count: totalEmployees, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'employee');

  if (profilesError) throw profilesError;

  const { data: records, error: attendanceError } = await supabaseAdmin
    .from('attendance_records')
    .select(`
      id,
      date,
      status,
      check_in,
      check_out,
      geofence_status,
      is_mock_location,
      gps_accuracy_meters,
      distance_from_office_meters,
      face_similarity,
      schedule_status,
      late_minutes,
      profiles:employee_id (
        full_name,
        department,
        position,
        attendance_mode,
        avatar_url
      ),
      office_locations:office_location_id (
        name
      )
    `)
    .eq('date', today)
    .order('check_in', { ascending: false });

  if (attendanceError) throw attendanceError;

  const { data: officeRows, error: officesError } = await supabaseAdmin
    .from('office_locations')
    .select('id, name, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (officesError) throw officesError;

  const primaryOffice = officeRows?.[0] || null;
  const rows = records || [];
  const presentCount = rows.length;
  const outsideCount = rows.filter((row) => row.geofence_status === 'outside').length;
  const fakeGpsCount = rows.filter((row) => row.is_mock_location).length;

  const summaryCards = buildSummaryCards({
    totalEmployees: totalEmployees || 0,
    presentCount,
    outsideCount,
    fakeGpsCount,
  });

  const latestAttendance = rows.slice(0, 5).map((row) => {
    const profile = row.profiles || {};
    const score = row.face_similarity ? `${(row.face_similarity * 100).toFixed(1)}%` : '-';

    return {
      name: profile.full_name || 'Tanpa Nama',
      role: profile.position || profile.department || '-',
      time: formatTime(row.check_in),
      score,
      status: profile.attendance_mode === 'field' ? 'Lapangan' : 'Hadir',
      avatarUrl: profile.avatar_url || null,
    };
  });

  const tableRows = rows.slice(0, 10).map((row) => {
    const profile = row.profiles || {};
    const office = row.office_locations || {};

    return {
      name: profile.full_name || 'Tanpa Nama',
      type: profile.attendance_mode || 'office',
      checkIn: formatTime(row.check_in),
      checkOut: formatTime(row.check_out),
      location: office.name || (profile.attendance_mode === 'remote' ? 'Remote' : 'Lokasi belum diatur'),
      geofence: mapGeofence(row.geofence_status),
      score: row.face_similarity ? `${(row.face_similarity * 100).toFixed(1)}%` : '-',
      workDuration: formatWorkDuration(row.check_in, row.check_out),
      lateStatus: buildLateStatus(row),
      status: mapStatusLabel(row),
      avatarUrl: profile.avatar_url || null,
    };
  });
  const trendData = await getSupabaseTrendData(totalEmployees || 0);

  return {
    source: 'supabase',
    generatedAt: new Date().toISOString(),
    primaryOffice: primaryOffice
      ? { id: primaryOffice.id, name: primaryOffice.name, is_active: true }
      : null,
    summaryCards,
    trendData,
    latestAttendance,
    tableRows,
    pagination: {
      from: tableRows.length ? 1 : 0,
      to: tableRows.length,
      total: presentCount,
      currentPage: 1,
      lastPage: Math.max(Math.ceil(presentCount / 10), 1),
    },
  };
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Supabase backend belum dikonfigurasi.',
    });
  }

  try {
    const data = await getSupabaseDashboardData();
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Dashboard Route Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard dari Supabase.',
      error: err.message,
    });
  }
});

module.exports = router;
