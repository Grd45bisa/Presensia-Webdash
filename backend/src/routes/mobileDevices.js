const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/deviceMockStore');

const router = express.Router();

// Mendaftarkan (bind) device untuk karyawan yang login via email/password.
// Logika sama dengan QR Login: nonaktifkan device lama, aktifkan device ini,
// dan kunci active_device_id di profiles. Dipanggil Mobile App sebelum heartbeat.
router.post('/register', async (req, res) => {
  const {
    employee_id: employeeId,
    device_id: deviceId,
    device_name: deviceName,
    platform,
    app_version: appVersion,
  } = req.body || {};

  if (!employeeId || !deviceId) {
    return res.status(400).json({ success: false, message: 'employee_id dan device_id wajib diisi.' });
  }

  if (!supabaseAdmin) {
    const device = mockStore.upsertDevice({
      employee_id: employeeId,
      device_id: deviceId,
      device_name: deviceName,
      platform,
      app_version: appVersion,
      bound_via: 'password_login',
    });

    return res.json({ success: true, data: device });
  }

  try {
    // 1. Nonaktifkan semua device lama milik karyawan ini (binding satu device aktif).
    await supabaseAdmin
      .from('user_devices')
      .update({ is_active: false })
      .eq('employee_id', employeeId);

    // 2. Upsert device baru sebagai aktif.
    const devicePayload = {
      employee_id: employeeId,
      device_id: deviceId,
      device_name: deviceName || 'Generic Device',
      platform: platform || 'unknown',
      app_version: appVersion || '1.0.0',
      is_active: true,
      bound_via: 'password_login',
      last_seen_at: new Date().toISOString(),
    };

    const { data: deviceData, error: deviceError } = await supabaseAdmin
      .from('user_devices')
      .upsert(devicePayload, { onConflict: 'employee_id,device_id' })
      .select()
      .single();

    if (deviceError) throw deviceError;

    // 3. Kunci active_device_id di profiles supaya heartbeat diterima.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        active_device_id: deviceId,
        device_bound_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (profileError) throw profileError;

    return res.json({ success: true, data: deviceData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/heartbeat', async (req, res) => {
  const {
    employee_id: employeeId,
    device_id: deviceId,
    device_name: deviceName,
    platform,
    app_version: appVersion,
  } = req.body || {};

  if (!employeeId || !deviceId) {
    return res.status(400).json({ success: false, message: 'employee_id dan device_id wajib diisi.' });
  }

  if (!supabaseAdmin) {
    const device = mockStore.heartbeat(employeeId, deviceId, {
      device_name: deviceName,
      platform,
      app_version: appVersion,
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device belum terdaftar.' });
    }

    return res.json({ success: true, data: device });
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('active_device_id')
      .eq('id', employeeId)
      .single();

    if (profileError) throw profileError;

    if (!profile?.active_device_id || profile.active_device_id !== deviceId) {
      return res.status(403).json({ success: false, message: 'Akses device ini sudah dicabut oleh admin.' });
    }

    const { data: existingDevice, error: findError } = await supabaseAdmin
      .from('user_devices')
      .select('id, is_active')
      .eq('employee_id', employeeId)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (findError) throw findError;

    if (existingDevice && !existingDevice.is_active) {
      return res.status(403).json({ success: false, message: 'Akses device ini sudah dicabut oleh admin.' });
    }

    const heartbeatPayload = {
      employee_id: employeeId,
      device_id: deviceId,
      device_name: deviceName || 'Presensia Device',
      platform: platform || 'unknown',
      app_version: appVersion || '1.0.0',
      is_active: true,
      bound_via: 'qr_login',
      last_seen_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('user_devices')
      .upsert(heartbeatPayload, { onConflict: 'employee_id,device_id' })
      .select()
      .single();

    if (error) {
      console.warn('[Mobile Device Heartbeat Warning]', error);
      return res.json({ success: true, data: heartbeatPayload, device_persisted: false });
    }

    return res.json({ success: true, data, device_persisted: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', async (req, res) => {
  const { employee_id: employeeId, device_id: deviceId } = req.body || {};

  if (!employeeId || !deviceId) {
    return res.status(400).json({ success: false, message: 'employee_id dan device_id wajib diisi.' });
  }

  if (!supabaseAdmin) {
    const device = mockStore.deactivateDevice(employeeId, deviceId);

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device belum terdaftar.' });
    }

    return res.json({ success: true, data: device });
  }

  try {
    const { error: deviceError } = await supabaseAdmin
      .from('user_devices')
      .update({ is_active: false })
      .eq('employee_id', employeeId)
      .eq('device_id', deviceId);

    if (deviceError) throw deviceError;

    const { data: profile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('active_device_id')
      .eq('id', employeeId)
      .single();

    if (profileCheckError) throw profileCheckError;

    if (profile?.active_device_id === deviceId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ active_device_id: null, device_bound_at: null })
        .eq('id', employeeId);

      if (profileError) throw profileError;
    }

    return res.json({ success: true, data: { employee_id: employeeId, device_id: deviceId, is_active: false } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
