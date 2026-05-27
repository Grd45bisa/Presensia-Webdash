const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/deviceMockStore');

const router = express.Router();

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
    const { data, error } = await supabaseAdmin
      .from('user_devices')
      .update({
        device_name: deviceName,
        platform,
        app_version: appVersion,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('employee_id', employeeId)
      .eq('device_id', deviceId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
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
