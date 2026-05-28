const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');

const router = express.Router();

let dashboardDataSource = 'supabase';
let requiresBlink = true; // State default untuk Liveness Detection berkedip di mobile apps
let mockShifts = [
  {
    id: 'shift-pagi',
    name: 'Shift Pagi',
    check_in_start: '07:30',
    check_in_end: '08:15',
    late_after: '08:00',
    check_out_start: '17:00',
    check_out_end: '18:00',
    crosses_midnight: false,
    is_active: true,
  },
];
let globalSettings = {
  organization: {
    name: 'PT Presensia Teknologi',
    address: 'Universitas Cendekia Abditama, Jl. Islamic Raya, Kelapa Dua, Tangerang',
    timezone: 'Asia/Jakarta',
    adminContact: 'hr@presensia.co.id',
  },
  attendance: {
    defaultRadiusMeters: 100,
    officeCheckInToleranceMinutes: 15,
    allowRemoteWithoutGeofence: true,
    scheduleEnabled: false,
    scheduleMode: 'free',
    officeCheckInStart: '07:30',
    officeCheckInEnd: '08:15',
    officeLateAfter: '08:00',
    officeCheckOutStart: '17:00',
    officeCheckOutEnd: '18:00',
    requireShiftSelection: true,
  },
  qrLogin: {
    expirationMinutes: 5,
    maxActiveTokensPerUser: 1,
  },
  faceSecurity: {
    minimumFaceThreshold: 0.7,
    requiresBlink: true,
    showEvidencePhotoToAdmin: true,
  },
  dashboard: {
    dataSource: 'supabase',
  },
  admin: {
    auditLogEnabled: false,
    employeeWebReadOnly: true,
  },
};

function normalizeSource(value) {
  return value === 'supabase' ? 'supabase' : 'supabase';
}

function normalizeVisibleSource(value) {
  return 'supabase';
}

function normalizeScheduleMode(value) {
  if (['free', 'office_hours', 'shift'].includes(value)) return value;
  return 'free';
}

function normalizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^\d{2}:\d{2}(:\d{2})?$/.test(trimmed) ? trimmed.slice(0, 5) : fallback;
}

function normalizeShift(row = {}) {
  return {
    id: row.id,
    name: row.name || 'Shift',
    check_in_start: normalizeTime(row.check_in_start, '07:30'),
    check_in_end: normalizeTime(row.check_in_end, '08:15'),
    late_after: normalizeTime(row.late_after, '08:00'),
    check_out_start: normalizeTime(row.check_out_start, '17:00'),
    check_out_end: normalizeTime(row.check_out_end, '18:00'),
    crosses_midnight: Boolean(row.crosses_midnight),
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function shiftPayloadFromBody(body = {}) {
  return {
    name: String(body.name || '').trim() || 'Shift',
    check_in_start: normalizeTime(body.check_in_start, '07:30'),
    check_in_end: normalizeTime(body.check_in_end, '08:15'),
    late_after: normalizeTime(body.late_after, '08:00'),
    check_out_start: normalizeTime(body.check_out_start, '17:00'),
    check_out_end: normalizeTime(body.check_out_end, '18:00'),
    crosses_midnight: Boolean(body.crosses_midnight),
    is_active: Boolean(body.is_active ?? true),
  };
}

function mergeGlobalSettings(nextSettings = {}) {
  return {
    organization: {
      ...globalSettings.organization,
      ...(nextSettings.organization || {}),
    },
    attendance: {
      ...globalSettings.attendance,
      ...(nextSettings.attendance || {}),
      defaultRadiusMeters: Number(nextSettings.attendance?.defaultRadiusMeters ?? globalSettings.attendance.defaultRadiusMeters),
      officeCheckInToleranceMinutes: Number(nextSettings.attendance?.officeCheckInToleranceMinutes ?? globalSettings.attendance.officeCheckInToleranceMinutes),
      allowRemoteWithoutGeofence: Boolean(nextSettings.attendance?.allowRemoteWithoutGeofence ?? globalSettings.attendance.allowRemoteWithoutGeofence),
      scheduleEnabled: Boolean(nextSettings.attendance?.scheduleEnabled ?? globalSettings.attendance.scheduleEnabled),
      scheduleMode: normalizeScheduleMode(nextSettings.attendance?.scheduleMode || globalSettings.attendance.scheduleMode),
      officeCheckInStart: normalizeTime(nextSettings.attendance?.officeCheckInStart, globalSettings.attendance.officeCheckInStart),
      officeCheckInEnd: normalizeTime(nextSettings.attendance?.officeCheckInEnd, globalSettings.attendance.officeCheckInEnd),
      officeLateAfter: normalizeTime(nextSettings.attendance?.officeLateAfter, globalSettings.attendance.officeLateAfter),
      officeCheckOutStart: normalizeTime(nextSettings.attendance?.officeCheckOutStart, globalSettings.attendance.officeCheckOutStart),
      officeCheckOutEnd: normalizeTime(nextSettings.attendance?.officeCheckOutEnd, globalSettings.attendance.officeCheckOutEnd),
      requireShiftSelection: Boolean(nextSettings.attendance?.requireShiftSelection ?? globalSettings.attendance.requireShiftSelection),
    },
    qrLogin: {
      ...globalSettings.qrLogin,
      ...(nextSettings.qrLogin || {}),
      expirationMinutes: Number(nextSettings.qrLogin?.expirationMinutes ?? globalSettings.qrLogin.expirationMinutes),
      maxActiveTokensPerUser: Number(nextSettings.qrLogin?.maxActiveTokensPerUser ?? globalSettings.qrLogin.maxActiveTokensPerUser),
    },
    faceSecurity: {
      ...globalSettings.faceSecurity,
      ...(nextSettings.faceSecurity || {}),
      minimumFaceThreshold: Number(nextSettings.faceSecurity?.minimumFaceThreshold ?? globalSettings.faceSecurity.minimumFaceThreshold),
      requiresBlink: Boolean(nextSettings.faceSecurity?.requiresBlink ?? globalSettings.faceSecurity.requiresBlink),
      showEvidencePhotoToAdmin: Boolean(nextSettings.faceSecurity?.showEvidencePhotoToAdmin ?? globalSettings.faceSecurity.showEvidencePhotoToAdmin),
    },
    dashboard: {
      ...globalSettings.dashboard,
      ...(nextSettings.dashboard || {}),
      dataSource: normalizeVisibleSource(nextSettings.dashboard?.dataSource || globalSettings.dashboard.dataSource),
    },
    admin: {
      ...globalSettings.admin,
      ...(nextSettings.admin || {}),
      auditLogEnabled: Boolean(nextSettings.admin?.auditLogEnabled ?? globalSettings.admin.auditLogEnabled),
      employeeWebReadOnly: Boolean(nextSettings.admin?.employeeWebReadOnly ?? globalSettings.admin.employeeWebReadOnly),
    },
  };
}

function applyGlobalSettings(settings) {
  globalSettings = mergeGlobalSettings(settings);
  dashboardDataSource = globalSettings.dashboard.dataSource;
  requiresBlink = globalSettings.faceSecurity.requiresBlink;
  return globalSettings;
}

async function loadGlobalSettingsFromDatabase() {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'global')
    .maybeSingle();

  if (error) throw error;
  return data?.value || null;
}

async function saveGlobalSettingsToDatabase(settings) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({
      key: 'global',
      value: settings,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

router.get('/dashboard-source', (req, res) => {
  res.json({
    success: true,
    data: {
      dashboardDataSource,
      options: ['supabase'],
    },
  });
});

router.put('/dashboard-source', (req, res) => {
  dashboardDataSource = 'supabase';
  globalSettings.dashboard.dataSource = 'supabase';

  res.json({
    success: true,
    message: 'Sumber data dashboard berhasil diperbarui.',
    data: {
      dashboardDataSource,
    },
  });
});

// GET /api/admin/settings/blink-detection
router.get('/blink-detection', async (req, res) => {
  try {
    const storedSettings = await loadGlobalSettingsFromDatabase();
    if (storedSettings) applyGlobalSettings(storedSettings);
  } catch (err) {
    console.error('[Blink Detection GET Fallback]', err);
  }

  res.json({
    success: true,
    data: {
      requiresBlink,
    },
  });
});

// PUT /api/admin/settings/blink-detection
router.put('/blink-detection', async (req, res) => {
  try {
    const storedSettings = await loadGlobalSettingsFromDatabase();
    if (storedSettings) applyGlobalSettings(storedSettings);
  } catch (err) {
    console.error('[Blink Detection PUT Load Fallback]', err);
  }

  requiresBlink = Boolean(req.body.requiresBlink);
  globalSettings.faceSecurity.requiresBlink = requiresBlink;

  try {
    await saveGlobalSettingsToDatabase(globalSettings);
  } catch (err) {
    console.error('[Blink Detection PUT Database Fallback]', err);
  }

  res.json({
    success: true,
    message: 'Pengaturan deteksi kedipan wajah berhasil diperbarui.',
    data: {
      requiresBlink,
    },
  });
});

router.get('/global', async (req, res) => {
  try {
    const storedSettings = await loadGlobalSettingsFromDatabase();
    if (storedSettings) {
      applyGlobalSettings(storedSettings);
    }
  } catch (err) {
    console.error('[Settings GET Fallback]', err);
  }

  res.json({
    success: true,
    data: globalSettings,
  });
});

router.put('/global', async (req, res) => {
  const nextSettings = req.body || {};

  applyGlobalSettings(nextSettings);

  try {
    await saveGlobalSettingsToDatabase(globalSettings);
  } catch (err) {
    console.error('[Settings PUT Database Fallback]', err);
  }

  res.json({
    success: true,
    message: 'Pengaturan global berhasil diperbarui.',
    data: globalSettings,
  });
});

router.get('/shifts', async (req, res, next) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('work_shifts')
        .select('*')
        .order('is_active', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return res.json({ success: true, data: (data || []).map(normalizeShift) });
    }

    return res.json({ success: true, data: mockShifts.map(normalizeShift) });
  } catch (err) {
    return next(err);
  }
});

router.post('/shifts', async (req, res, next) => {
  try {
    const payload = shiftPayloadFromBody(req.body || {});

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('work_shifts')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json({
        success: true,
        message: 'Shift kerja berhasil ditambahkan.',
        data: normalizeShift(data),
      });
    }

    const item = {
      id: `shift-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockShifts.push(item);
    return res.status(201).json({ success: true, data: normalizeShift(item) });
  } catch (err) {
    return next(err);
  }
});

router.put('/shifts/:id', async (req, res, next) => {
  try {
    const payload = shiftPayloadFromBody(req.body || {});

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('work_shifts')
        .update(payload)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) throw error;
      return res.json({
        success: true,
        message: 'Shift kerja berhasil diperbarui.',
        data: normalizeShift(data),
      });
    }

    mockShifts = mockShifts.map((shift) => (
      shift.id === req.params.id
        ? { ...shift, ...payload, updated_at: new Date().toISOString() }
        : shift
    ));
    const item = mockShifts.find((shift) => shift.id === req.params.id);
    return res.json({ success: true, data: normalizeShift(item) });
  } catch (err) {
    return next(err);
  }
});

router.delete('/shifts/:id', async (req, res, next) => {
  try {
    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('work_shifts')
        .update({ is_active: false })
        .eq('id', req.params.id);

      if (error) throw error;
      return res.json({ success: true, message: 'Shift kerja dinonaktifkan.' });
    }

    mockShifts = mockShifts.map((shift) => (
      shift.id === req.params.id ? { ...shift, is_active: false } : shift
    ));
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
