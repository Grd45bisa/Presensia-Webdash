const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const employeeStore = require('../lib/employeeMockStore');
const officeStore = require('../lib/officeMockStore');

const router = express.Router();

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

module.exports = router;
