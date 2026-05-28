const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const employeeStore = require('../lib/employeeMockStore');
const officeStore = require('../lib/officeMockStore');

const router = express.Router();

const defaultScheduleSettings = {
  scheduleEnabled: false,
  scheduleMode: 'free',
  officeCheckInStart: '07:30',
  officeCheckInEnd: '08:15',
  officeLateAfter: '08:00',
  officeCheckOutStart: '17:00',
  officeCheckOutEnd: '18:00',
  requireShiftSelection: true,
};

function normalizeShift(row = {}) {
  return {
    id: row.id,
    name: row.name || 'Shift',
    check_in_start: (row.check_in_start || '07:30').slice(0, 5),
    check_in_end: (row.check_in_end || '08:15').slice(0, 5),
    late_after: (row.late_after || '08:00').slice(0, 5),
    check_out_start: (row.check_out_start || '17:00').slice(0, 5),
    check_out_end: (row.check_out_end || '18:00').slice(0, 5),
    crosses_midnight: Boolean(row.crosses_midnight),
    is_active: Boolean(row.is_active ?? true),
  };
}

async function loadScheduleConfig() {
  if (!supabaseAdmin) {
    return {
      schedule: defaultScheduleSettings,
      shifts: [],
    };
  }

  const { data: settingsRow, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'global')
    .maybeSingle();

  if (settingsError) throw settingsError;

  const schedule = {
    ...defaultScheduleSettings,
    ...(settingsRow?.value?.attendance || {}),
  };

  const { data: shifts, error: shiftsError } = await supabaseAdmin
    .from('work_shifts')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (shiftsError) throw shiftsError;

  return {
    schedule,
    shifts: (shifts || []).map(normalizeShift),
  };
}

function timeToMinutes(value) {
  const [hour, minute] = String(value || '00:00').split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeForWindow(value, start, crossesMidnight) {
  if (!crossesMidnight) return value;
  return value < start ? value + 1440 : value;
}

function getJakartaMinutes(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(value);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(map.hour) * 60 + Number(map.minute);
}

function evaluateCheckIn(rule, nowMinutes) {
  const start = timeToMinutes(rule.check_in_start);
  const end = normalizeForWindow(timeToMinutes(rule.check_in_end), start, rule.crosses_midnight);
  const lateAfter = normalizeForWindow(timeToMinutes(rule.late_after), start, rule.crosses_midnight);
  const current = normalizeForWindow(nowMinutes, start, rule.crosses_midnight);
  const lateMinutes = Math.max(0, current - lateAfter);

  return {
    allowed: current >= start && current <= end,
    schedule_status: lateMinutes > 0 ? 'late' : 'present',
    late_minutes: lateMinutes,
    message: lateMinutes > 0
      ? `Check-in terlambat ${lateMinutes} menit.`
      : 'Check-in sesuai jadwal.',
  };
}

function evaluateCheckOut(rule, nowMinutes) {
  const start = timeToMinutes(rule.check_out_start);
  const end = normalizeForWindow(timeToMinutes(rule.check_out_end), start, rule.crosses_midnight);
  const current = normalizeForWindow(nowMinutes, start, rule.crosses_midnight);
  const beforeCheckoutWindow = current < start;
  const afterNormalWindow = current > end;

  return {
    allowed: true,
    schedule_status: beforeCheckoutWindow
      ? 'early_leave'
      : afterNormalWindow
        ? 'checkout_late_prompt'
        : 'present',
    requires_checkout_reason: afterNormalWindow,
    message: beforeCheckoutWindow
      ? 'Check-out lebih awal dari jam pulang normal dan akan ditandai pulang duluan.'
      : afterNormalWindow
        ? 'Check-out melewati jam normal. Tanyakan apakah karyawan lembur atau lupa absen pulang.'
        : 'Check-out sesuai jadwal.',
  };
}

function distanceInMeters(from, to) {
  const earthRadius = 6371000;
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadius * c);
}

function buildValidation(employee, office, point) {
  const attendanceMode = employee.attendance_mode || 'office';
  const canAttendOutsideOffice = Boolean(employee.can_attend_outside_office);
  const requiresOfficeGeofence = attendanceMode === 'office' && !canAttendOutsideOffice;

  if (!requiresOfficeGeofence) {
    return {
      allowed: true,
      geofence_status: 'not_required',
      attendance_mode: attendanceMode,
      can_attend_outside_office: canAttendOutsideOffice,
      message: 'Mode presensi karyawan ini tidak wajib berada di radius kantor.',
    };
  }

  if (!office) {
    return {
      allowed: false,
      geofence_status: 'missing_office',
      attendance_mode: attendanceMode,
      can_attend_outside_office: canAttendOutsideOffice,
      message: 'Karyawan kantor belum memiliki lokasi kantor aktif.',
    };
  }

  if (!office.is_active) {
    return {
      allowed: false,
      geofence_status: 'office_inactive',
      attendance_mode: attendanceMode,
      can_attend_outside_office: canAttendOutsideOffice,
      office_location: normalizeOffice(office),
      message: 'Lokasi kantor sedang nonaktif.',
    };
  }

  const radius = Number(office.radius_meters || 100);
  const distance = distanceInMeters(point, {
    latitude: Number(office.latitude),
    longitude: Number(office.longitude),
  });
  const allowed = distance <= radius;

  return {
    allowed,
    geofence_status: allowed ? 'inside' : 'outside',
    attendance_mode: attendanceMode,
    can_attend_outside_office: canAttendOutsideOffice,
    distance_meters: distance,
    radius_meters: radius,
    office_location: normalizeOffice(office),
    message: allowed
      ? 'Karyawan berada di dalam radius kantor dan boleh presensi.'
      : 'Karyawan kantor wajib berada dalam radius geofence kantor untuk presensi.',
  };
}

function normalizeOffice(office) {
  if (!office) return null;

  return {
    id: office.id,
    name: office.name,
    address: office.address,
    latitude: Number(office.latitude),
    longitude: Number(office.longitude),
    radius_meters: Number(office.radius_meters || 100),
    is_active: Boolean(office.is_active),
    maps_url: office.maps_url || '',
  };
}

function findMockOffice(id) {
  return [
    ...officeStore.listOffices(),
    ...employeeStore.offices,
  ].find((office) => office.id === id);
}

async function getSupabaseEmployee(employeeId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(`
      id,
      full_name,
      attendance_mode,
      can_attend_outside_office,
      office_location_id,
      office_locations:office_location_id (
        id,
        name,
        address,
        latitude,
        longitude,
        radius_meters,
        is_active
      )
    `)
    .eq('id', employeeId)
    .single();

  if (error) throw error;
  return data;
}

router.post('/validate-geofence', async (req, res, next) => {
  try {
    const { employee_id: employeeId, latitude, longitude } = req.body || {};
    const point = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };

    if (!employeeId || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      return res.status(400).json({
        success: false,
        message: 'employee_id, latitude, dan longitude wajib diisi.',
      });
    }

    if (supabaseAdmin) {
      const employee = await getSupabaseEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
      }

      const validation = buildValidation(employee, employee.office_locations, point);
      return res.json({ success: true, source: 'supabase', validation });
    }

    const employee = employeeStore.listEmployees().find((item) => item.id === employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    }

    const office = findMockOffice(employee.office_location_id);
    const validation = buildValidation(employee, office, point);

    return res.json({ success: true, source: 'mock', validation });
  } catch (err) {
    return next(err);
  }
});

router.get('/schedule-config', async (req, res, next) => {
  try {
    if (!supabaseAdmin) {
      return res.json({
        success: true,
        data: {
          schedule: defaultScheduleSettings,
          shifts: [],
        },
      });
    }

    const data = await loadScheduleConfig();
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
});

router.post('/validate-schedule', async (req, res, next) => {
  try {
    const {
      action = 'check-in',
      shift_id: shiftId,
      timestamp,
    } = req.body || {};

    const { schedule, shifts } = await loadScheduleConfig();
    const now = timestamp ? new Date(timestamp) : new Date();
    const nowMinutes = getJakartaMinutes(now);

    if (!schedule.scheduleEnabled || schedule.scheduleMode === 'free') {
      return res.json({
        success: true,
        data: {
          allowed: true,
          schedule_mode: 'free',
          schedule_status: 'present',
          late_minutes: 0,
          requires_checkout_reason: false,
          message: 'Aturan jam presensi sedang nonaktif.',
        },
      });
    }

    let rule = {
      check_in_start: schedule.officeCheckInStart,
      check_in_end: schedule.officeCheckInEnd,
      late_after: schedule.officeLateAfter,
      check_out_start: schedule.officeCheckOutStart,
      check_out_end: schedule.officeCheckOutEnd,
      crosses_midnight: false,
    };

    if (schedule.scheduleMode === 'shift') {
      const shift = shifts.find((item) => item.id === shiftId);
      if (!shift) {
        return res.status(400).json({
          success: false,
          message: 'Pilih shift kerja aktif sebelum presensi.',
        });
      }
      rule = shift;
    }

    const result = action === 'check-out'
      ? evaluateCheckOut(rule, nowMinutes)
      : evaluateCheckIn(rule, nowMinutes);

    return res.json({
      success: true,
      data: {
        ...result,
        schedule_mode: schedule.scheduleMode,
        selected_shift_id: schedule.scheduleMode === 'shift' ? shiftId : null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
