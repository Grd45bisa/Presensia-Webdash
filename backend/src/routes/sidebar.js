const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const employeeStore = require('../lib/employeeMockStore');
const officeStore = require('../lib/officeMockStore');
const deviceStore = require('../lib/deviceMockStore');
const qrStore = require('../lib/qrLoginMockStore');
const worklogStore = require('../lib/worklogMockStore');
const attendanceStore = require('../lib/attendanceMockStore');

const router = express.Router();

function getJakartaDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function buildMockSidebarData() {
  const employees = employeeStore.listEmployees();
  const offices = officeStore.listOffices();
  const devices = deviceStore.listDevices();
  const tokens = qrStore.listTokens();
  const today = getJakartaDate();
  const worklogs = worklogStore.listWorklogs({ from: today, to: today });
  const attendance = attendanceStore.getSummary();
  const issueCount = attendance.outsideGeofence + attendance.fakeGps + attendance.notCheckout;

  return {
    source: 'mock',
    generatedAt: new Date().toISOString(),
    counters: {
      dashboardIssues: issueCount,
      employees: employees.length,
      attendanceToday: attendance.today,
      attendanceIssues: issueCount,
      offices: offices.filter((office) => office.is_active).length,
      qrActive: tokens.filter((token) => token.status === 'active').length,
      devicesActive: devices.filter((device) => device.is_active).length,
      devicesInactive: devices.filter((device) => !device.is_active).length,
      worklogsToday: worklogs.length,
      reportsReady: 1,
      settingsMode: 'mock',
    },
  };
}

async function getCount(table, queryBuilder) {
  const query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
  const { count, error } = await queryBuilder(query);

  if (error) throw error;
  return count || 0;
}

async function buildSupabaseSidebarData() {
  const today = getJakartaDate();
  const now = new Date().toISOString();

  const [
    employees,
    attendanceToday,
    offices,
    qrActive,
    devicesActive,
    devicesInactive,
    worklogsToday,
    attendanceRowsResult,
  ] = await Promise.all([
    getCount('profiles', (query) => query.eq('role', 'employee')),
    getCount('attendance_records', (query) => query.eq('date', today)),
    getCount('office_locations', (query) => query.eq('is_active', true)),
    getCount('qr_login_tokens', (query) => query.eq('status', 'active').gt('expires_at', now)),
    getCount('user_devices', (query) => query.eq('is_active', true)),
    getCount('user_devices', (query) => query.eq('is_active', false)),
    getCount('worklog_entries', (query) => query.eq('date', today)),
    supabaseAdmin
      .from('attendance_records')
      .select('check_out, geofence_status, is_mock_location')
      .eq('date', today),
  ]);

  if (attendanceRowsResult.error) throw attendanceRowsResult.error;

  const attendanceRows = attendanceRowsResult.data || [];
  const attendanceIssues = attendanceRows.filter((row) => (
    !row.check_out || row.geofence_status === 'outside' || row.is_mock_location
  )).length;

  return {
    source: 'supabase',
    generatedAt: new Date().toISOString(),
    counters: {
      dashboardIssues: attendanceIssues,
      employees,
      attendanceToday,
      attendanceIssues,
      offices,
      qrActive,
      devicesActive,
      devicesInactive,
      worklogsToday,
      reportsReady: 1,
      settingsMode: 'supabase',
    },
  };
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.json({
      success: true,
      data: buildMockSidebarData(),
    });
  }

  try {
    const data = await buildSupabaseSidebarData();
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Sidebar Route Fallback]', err);
    return res.json({
      success: true,
      data: {
        ...buildMockSidebarData(),
        fallbackReason: 'Sidebar memakai data sementara karena query Supabase gagal.',
      },
    });
  }
});

module.exports = router;
