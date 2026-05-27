const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');

const router = express.Router();

let dashboardDataSource = process.env.DASHBOARD_DATA_SOURCE || 'auto';
let requiresBlink = true; // State default untuk Liveness Detection berkedip di mobile apps
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
    dataSource: normalizeVisibleSource(dashboardDataSource),
  },
  admin: {
    auditLogEnabled: false,
    employeeWebReadOnly: true,
  },
};

function normalizeSource(value) {
  if (['auto', 'mock', 'supabase'].includes(value)) {
    return value;
  }

  return 'auto';
}

function normalizeVisibleSource(value) {
  return value === 'supabase' ? 'supabase' : 'mock';
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
      options: ['auto', 'mock', 'supabase'],
    },
  });
});

router.put('/dashboard-source', (req, res) => {
  dashboardDataSource = normalizeSource(req.body.dashboardDataSource);
  globalSettings.dashboard.dataSource = normalizeVisibleSource(dashboardDataSource);

  res.json({
    success: true,
    message: 'Sumber data dashboard berhasil diperbarui.',
    data: {
      dashboardDataSource,
    },
  });
});

// GET /api/admin/settings/blink-detection
router.get('/blink-detection', (req, res) => {
  res.json({
    success: true,
    data: {
      requiresBlink,
    },
  });
});

// PUT /api/admin/settings/blink-detection
router.put('/blink-detection', (req, res) => {
  requiresBlink = Boolean(req.body.requiresBlink);
  globalSettings.faceSecurity.requiresBlink = requiresBlink;

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

module.exports = router;
