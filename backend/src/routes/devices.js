const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/deviceMockStore');

const router = express.Router();

function normalizeDevice(row) {
  const profile = row.profiles || {};

  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || profile.full_name || '-',
    employee_email: row.employee_email || profile.email || '-',
    device_id: row.device_id,
    device_name: row.device_name || 'Unknown Device',
    platform: row.platform || 'unknown',
    app_version: row.app_version || '-',
    is_active: Boolean(row.is_active),
    is_current_device: row.is_current_device !== undefined
      ? Boolean(row.is_current_device)
      : profile.active_device_id === row.device_id,
    bound_via: row.bound_via || 'qr_login',
    last_seen_at: row.last_seen_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listFromSupabase() {
  const { data, error } = await supabaseAdmin
    .from('user_devices')
    .select(`
      id,
      employee_id,
      device_id,
      device_name,
      platform,
      app_version,
      is_active,
      bound_via,
      last_seen_at,
      created_at,
      updated_at,
      profiles:employee_id (
        full_name,
        email,
        active_device_id
      )
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(normalizeDevice);
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.json({
      success: true,
      data: {
        source: 'mock',
        devices: mockStore.listDevices().map(normalizeDevice),
      },
    });
  }

  try {
    return res.json({
      success: true,
      data: {
        source: 'supabase',
        devices: await listFromSupabase(),
      },
    });
  } catch (err) {
    console.error('[Devices GET Fallback]', err);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
        devices: mockStore.listDevices().map(normalizeDevice),
      },
    });
  }
});

router.post('/reset', async (req, res) => {
  const { employee_id: employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'ID karyawan wajib diisi.' });
  }

  if (!supabaseAdmin) {
    mockStore.resetEmployeeDevices(employeeId);
    return res.json({
      success: true,
      message: 'Semua device karyawan berhasil dicopot.',
      data: { employee_id: employeeId },
    });
  }

  try {
    const { error: deviceError } = await supabaseAdmin
      .from('user_devices')
      .update({ is_active: false })
      .eq('employee_id', employeeId);

    if (deviceError) throw deviceError;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ active_device_id: null, device_bound_at: null })
      .eq('id', employeeId);

    if (profileError) throw profileError;

    return res.json({
      success: true,
      message: 'Semua device karyawan berhasil dicopot.',
      data: { employee_id: employeeId },
    });
  } catch (err) {
    console.error('[Reset Device Route Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/revoke', async (req, res) => {
  const { employee_id: employeeId, device_id: deviceId } = req.body;

  if (!employeeId || !deviceId) {
    return res.status(400).json({ success: false, message: 'ID karyawan dan device wajib diisi.' });
  }

  if (!supabaseAdmin) {
    const updated = mockStore.deactivateDevice(employeeId, deviceId);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Device tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Device berhasil dicopot.',
      data: normalizeDevice(updated),
    });
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

    return res.json({
      success: true,
      message: 'Device berhasil dicopot.',
      data: { employee_id: employeeId, device_id: deviceId, is_active: false },
    });
  } catch (err) {
    console.error('[Revoke Device Route Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
