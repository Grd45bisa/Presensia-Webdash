const express = require('express');
const crypto = require('crypto');
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/qrLoginMockStore');

const router = express.Router();

function buildQrPayload(rawToken) {
  return JSON.stringify({
    type: 'presensia_qr_login',
    token: rawToken,
  });
}

function normalizeToken(row) {
  const profile = row.profiles || {};
  const expiresAt = new Date(row.expires_at);
  const status = row.status === 'active' && expiresAt <= new Date() ? 'expired' : row.status;

  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: row.employee_name || profile.full_name || '-',
    employee_email: row.employee_email || profile.email || '-',
    status,
    expires_at: row.expires_at,
    created_at: row.created_at,
    used_at: row.used_at || null,
    used_device_id: row.used_device_id || null,
  };
}

async function listFromSupabase() {
  const { data, error } = await supabaseAdmin
    .from('qr_login_tokens')
    .select(`
      id,
      employee_id,
      status,
      expires_at,
      created_at,
      used_at,
      used_device_id,
      profiles:employee_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data || []).map(normalizeToken);
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.json({
      success: true,
      data: {
        source: 'mock',
        tokens: mockStore.listTokens().map(normalizeToken),
      },
    });
  }

  try {
    return res.json({
      success: true,
      data: {
        source: 'supabase',
        tokens: await listFromSupabase(),
      },
    });
  } catch (err) {
    console.error('[QR Login List Fallback]', err);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
        tokens: mockStore.listTokens().map(normalizeToken),
      },
    });
  }
});

router.post('/generate', async (req, res) => {
  const { employee_id: employeeId, expires_in_minutes: expiresInMinutes = 5 } = req.body;

  if (!employeeId) {
    return res.status(400).json({
      success: false,
      message: 'Karyawan wajib dipilih.',
    });
  }

  if (!supabaseAdmin) {
    const result = mockStore.createToken({
      employee_id: employeeId,
      expires_in_minutes: expiresInMinutes,
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    return res.status(201).json({
      success: true,
      message: 'QR login mock berhasil dibuat.',
      data: {
        token: result.token,
        qr_payload: buildQrPayload(result.token),
        token_record: normalizeToken(result.record),
      },
    });
  }

  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', employeeId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    }

    if (profile.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Akun admin tidak boleh login melalui QR.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + Number(expiresInMinutes || 5) * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('qr_login_tokens')
      .insert({
        employee_id: employeeId,
        token_hash: tokenHash,
        status: 'active',
        expires_at: expiresAt,
        created_by: req.body.created_by || null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'QR login berhasil dibuat.',
      data: {
        token: rawToken,
        qr_payload: buildQrPayload(rawToken),
        token_record: normalizeToken({
          ...data,
          employee_name: profile.full_name,
          employee_email: profile.email,
        }),
      },
    });
  } catch (err) {
    console.error('[Generate QR Token Error]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
  }
});

router.post('/revoke', async (req, res) => {
  const { token_id: tokenId } = req.body;

  if (!tokenId) {
    return res.status(400).json({ success: false, message: 'ID token wajib diisi.' });
  }

  if (!supabaseAdmin) {
    const updated = mockStore.revokeToken(tokenId);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Token tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Token berhasil dibatalkan.',
      data: normalizeToken(updated),
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('qr_login_tokens')
      .update({ status: 'revoked' })
      .eq('id', tokenId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      message: 'Token berhasil dibatalkan.',
      data: normalizeToken(data),
    });
  } catch (err) {
    console.error('[Revoke QR Token Error]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
  }
});

module.exports = router;
