const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const attendanceMockStore = require('../lib/attendanceMockStore');

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
    const allRecords = attendanceMockStore.listAttendance();
    return {
      source: 'mock',
      allRecords,
      records: applyFilters(allRecords, filters),
    };
  }

  try {
    const dateFiltered = await listSupabaseRecords(filters);
    return {
      source: 'supabase',
      allRecords: dateFiltered,
      records: applyFilters(dateFiltered, filters),
    };
  } catch (err) {
    console.error('[Reports Attendance Fallback]', err);
    const allRecords = attendanceMockStore.listAttendance();
    return {
      source: 'mock',
      fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
      allRecords,
      records: applyFilters(allRecords, filters),
    };
  }
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function formatCsvTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function toCsv(records) {
  const rows = [
    ['Tanggal', 'Karyawan', 'Email', 'Departemen', 'Posisi', 'Check-in', 'Check-out', 'Tipe Presensi', 'Status Laporan', 'Geofence', 'Fake GPS'],
    ...records.map((row) => [
      row.date,
      row.employee_name,
      row.employee_email,
      row.department,
      row.position,
      formatCsvTime(row.check_in),
      formatCsvTime(row.check_out),
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

  const result = await getReportRecords(filters);

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

  const result = await getReportRecords(filters);
  const filename = `Laporan_Presensi_${filters.from || 'awal'}_${filters.to || 'akhir'}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(toCsv(result.records));
});

module.exports = router;
