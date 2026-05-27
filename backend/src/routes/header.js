const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const { getMockDashboardData } = require('../lib/dashboardMock');
const employeeStore = require('../lib/employeeMockStore');
const officeStore = require('../lib/officeMockStore');
const deviceStore = require('../lib/deviceMockStore');

const router = express.Router();
const readNotificationIds = new Set();

function getJakartaDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function makeNotification({ id, title, description, tone, path }) {
  return {
    id,
    title,
    description,
    tone,
    path,
    is_read: readNotificationIds.has(id),
    created_at: new Date().toISOString(),
  };
}

function buildMockNotifications(date) {
  const dashboard = getMockDashboardData();
  const outsideCard = dashboard.summaryCards.find((card) => card.title === 'Di Luar Geofence');
  const fakeGpsCard = dashboard.summaryCards.find((card) => card.title === 'Indikasi Fake GPS');
  const openCheckout = dashboard.tableRows.filter((row) => row.status !== 'Selesai').length;
  const inactiveDevices = deviceStore.listDevices().filter((device) => !device.is_active).length;

  return [
    makeNotification({
      id: `fake-gps-${date}`,
      title: 'Indikasi fake GPS',
      description: `${fakeGpsCard?.value || 0} presensi perlu diperiksa ulang.`,
      tone: 'rose',
      path: '/presensi',
    }),
    makeNotification({
      id: `outside-geofence-${date}`,
      title: 'Di luar geofence',
      description: `${outsideCard?.value || 0} presensi berada di luar radius kantor.`,
      tone: 'red',
      path: '/presensi',
    }),
    makeNotification({
      id: `checkout-${date}`,
      title: 'Belum check-out',
      description: `${openCheckout} karyawan belum menutup presensi hari ini.`,
      tone: 'amber',
      path: '/presensi',
    }),
    makeNotification({
      id: `device-${date}`,
      title: 'Perangkat tidak aktif',
      description: `${inactiveDevices} device tercatat tidak aktif.`,
      tone: 'blue',
      path: '/devices',
    }),
  ].filter((item) => !item.description.startsWith('0 '));
}

async function buildSupabaseNotifications(date) {
  const { data: records, error: attendanceError } = await supabaseAdmin
    .from('attendance_records')
    .select('id, check_out, geofence_status, is_mock_location')
    .eq('date', date);

  if (attendanceError) throw attendanceError;

  const { data: devices, error: devicesError } = await supabaseAdmin
    .from('user_devices')
    .select('id, is_active')
    .eq('is_active', false)
    .limit(20);

  if (devicesError) throw devicesError;

  const rows = records || [];
  const fakeGpsCount = rows.filter((row) => row.is_mock_location).length;
  const outsideCount = rows.filter((row) => row.geofence_status === 'outside').length;
  const openCheckout = rows.filter((row) => !row.check_out).length;
  const inactiveDevices = (devices || []).length;

  return [
    makeNotification({
      id: `fake-gps-${date}`,
      title: 'Indikasi fake GPS',
      description: `${fakeGpsCount} presensi perlu diperiksa ulang.`,
      tone: 'rose',
      path: '/presensi',
    }),
    makeNotification({
      id: `outside-geofence-${date}`,
      title: 'Di luar geofence',
      description: `${outsideCount} presensi berada di luar radius kantor.`,
      tone: 'red',
      path: '/presensi',
    }),
    makeNotification({
      id: `checkout-${date}`,
      title: 'Belum check-out',
      description: `${openCheckout} karyawan belum menutup presensi hari ini.`,
      tone: 'amber',
      path: '/presensi',
    }),
    makeNotification({
      id: `device-${date}`,
      title: 'Perangkat tidak aktif',
      description: `${inactiveDevices} device tercatat tidak aktif.`,
      tone: 'blue',
      path: '/devices',
    }),
  ].filter((item) => !item.description.startsWith('0 '));
}

async function getSupabaseAdminProfile() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role, avatar_url, position')
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return {
    id: data?.id || 'admin',
    name: data?.full_name || 'Admin Presensia',
    email: data?.email || 'admin@presensia.com',
    role: data?.position || 'Super Admin',
    avatarUrl: data?.avatar_url || null,
  };
}

function getMockAdminProfile() {
  return {
    id: 'mock-admin',
    name: 'Siti Nurhaliza',
    email: 'admin@presensia.com',
    role: 'HR Admin',
    avatarUrl: null,
  };
}

function buildModuleResults(query) {
  const modules = [
    { label: 'Dashboard', description: 'Ringkasan presensi dan anomali', path: '/', type: 'module' },
    { label: 'Manajemen Karyawan', description: 'Data karyawan dan akun presensia', path: '/karyawan', type: 'module' },
    { label: 'Riwayat Presensi', description: 'Check-in, check-out, geofence, wajah', path: '/presensi', type: 'module' },
    { label: 'Lokasi Kantor', description: 'Titik kantor dan radius geofence', path: '/lokasi-kantor', type: 'module' },
    { label: 'Secure QR Login', description: 'QR login karyawan dan token aktif', path: '/qr-login', type: 'module' },
    { label: 'Manajemen Perangkat', description: 'Device aktif dan reset login', path: '/devices', type: 'module' },
    { label: 'Aktivitas Worklog', description: 'Catatan pekerjaan harian', path: '/worklog', type: 'module' },
    { label: 'Laporan & Ekspor', description: 'Rekap presensi dan export CSV', path: '/laporan', type: 'module' },
    { label: 'Pengaturan Global', description: 'Sumber data, wajah, QR, radius', path: '/pengaturan', type: 'module' },
  ];

  const normalized = query.toLowerCase();
  return modules.filter((item) => (
    item.label.toLowerCase().includes(normalized) ||
    item.description.toLowerCase().includes(normalized)
  ));
}

function buildMockSearchResults(query) {
  const normalized = query.toLowerCase();
  const employees = employeeStore.listEmployees()
    .filter((item) => (
      item.full_name.toLowerCase().includes(normalized) ||
      item.email.toLowerCase().includes(normalized) ||
      item.department.toLowerCase().includes(normalized)
    ))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      label: item.full_name,
      description: `${item.position || '-'} · ${item.department || '-'}`,
      path: '/karyawan',
      type: 'employee',
    }));

  const offices = officeStore.listOffices()
    .filter((item) => (
      item.name.toLowerCase().includes(normalized) ||
      item.address.toLowerCase().includes(normalized)
    ))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.name,
      description: item.address,
      path: '/lokasi-kantor',
      type: 'office',
    }));

  return [...buildModuleResults(query), ...employees, ...offices].slice(0, 8);
}

async function buildSupabaseSearchResults(query) {
  const moduleResults = buildModuleResults(query);
  const normalized = query.replaceAll(',', ' ');

  const { data: employees, error: employeeError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, department, position')
    .eq('role', 'employee')
    .or(`full_name.ilike.%${normalized}%,email.ilike.%${normalized}%,department.ilike.%${normalized}%,position.ilike.%${normalized}%`)
    .limit(5);

  if (employeeError) throw employeeError;

  const { data: offices, error: officeError } = await supabaseAdmin
    .from('office_locations')
    .select('id, name, address')
    .or(`name.ilike.%${normalized}%,address.ilike.%${normalized}%`)
    .limit(4);

  if (officeError) throw officeError;

  return [
    ...moduleResults,
    ...(employees || []).map((item) => ({
      id: item.id,
      label: item.full_name,
      description: `${item.position || '-'} · ${item.department || item.email || '-'}`,
      path: '/karyawan',
      type: 'employee',
    })),
    ...(offices || []).map((item) => ({
      id: item.id,
      label: item.name,
      description: item.address,
      path: '/lokasi-kantor',
      type: 'office',
    })),
  ].slice(0, 8);
}

router.get('/', async (req, res) => {
  const date = req.query.date || getJakartaDate();

  if (!supabaseAdmin) {
    const notifications = buildMockNotifications(date);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        currentDate: date,
        admin: getMockAdminProfile(),
        notifications,
        unreadCount: notifications.filter((item) => !item.is_read).length,
      },
    });
  }

  try {
    const [admin, notifications] = await Promise.all([
      getSupabaseAdminProfile(),
      buildSupabaseNotifications(date),
    ]);

    return res.json({
      success: true,
      data: {
        source: 'supabase',
        currentDate: date,
        admin,
        notifications,
        unreadCount: notifications.filter((item) => !item.is_read).length,
      },
    });
  } catch (err) {
    console.error('[Header Route Fallback]', err);
    const notifications = buildMockNotifications(date);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        currentDate: date,
        fallbackReason: 'Header memakai data sementara karena query Supabase gagal.',
        admin: getMockAdminProfile(),
        notifications,
        unreadCount: notifications.filter((item) => !item.is_read).length,
      },
    });
  }
});

router.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query.length < 2) {
    return res.json({ success: true, data: [] });
  }

  if (!supabaseAdmin) {
    return res.json({ success: true, data: buildMockSearchResults(query) });
  }

  try {
    const results = await buildSupabaseSearchResults(query);
    return res.json({ success: true, data: results });
  } catch (err) {
    console.error('[Header Search Fallback]', err);
    return res.json({ success: true, data: buildMockSearchResults(query) });
  }
});

router.post('/notifications/:id/read', (req, res) => {
  readNotificationIds.add(req.params.id);

  res.json({
    success: true,
    data: {
      id: req.params.id,
      is_read: true,
    },
  });
});

module.exports = router;
