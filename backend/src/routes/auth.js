const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = require('../lib/supabaseAdmin');
const qrMockStore = require('../lib/qrLoginMockStore');
const deviceMockStore = require('../lib/deviceMockStore');

function createOtpExchangeClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}

// ─── POST /api/auth/qr-login ────────────────────────────────────────────────
// Fungsi: Publik login untuk karyawan via scan QR Code dari handphone
router.post('/qr-login', async (req, res) => {
  const startedAt = Date.now();
  const { token, device_id, device_name, platform, app_version } = req.body;

  if (!token || !device_id) {
    return res.status(400).json({
      success: false,
      message: 'Token QR dan ID Perangkat (device_id) wajib disertakan.'
    });
  }

  try {
    if (!supabaseAdmin) {
      const result = qrMockStore.consumeToken(token, device_id);

      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }

      const device = deviceMockStore.upsertDevice({
        employee_id: result.employee.id,
        device_id,
        device_name: device_name || 'Generic Device',
        platform: platform || 'unknown',
        app_version: app_version || '1.0.0',
        bound_via: 'qr_login',
      });

      return res.json({
        success: true,
        message: 'QR Login mock sukses. Sesi berhasil dibuat.',
        data: {
          profile: result.employee,
          device,
        },
        session: {
          access_token: `mock-access-${result.employee.id}-${Date.now()}`,
          refresh_token: `mock-refresh-${result.employee.id}-${Date.now()}`,
          expires_in: 3600,
          user: {
            id: result.employee.id,
            email: result.employee.email,
          },
        },
      });
    }

    // 1. Hash token mentah untuk dicocokkan dengan database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Cari token yang valid dan belum expired di database
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from('qr_login_tokens')
      .select('*')
      .eq('token_hash', tokenHash)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenRecord) {
      return res.status(400).json({
        success: false,
        message: 'QR Code tidak valid, sudah digunakan, atau telah kedaluwarsa.'
      });
    }

    const employeeId = tokenRecord.employee_id;

    // 3. Tarik data profil karyawan untuk memverifikasi email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, role')
      .eq('id', employeeId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil karyawan tidak ditemukan.'
      });
    }

    // Pastikan karyawan tidak bisa login jika rolenya adalah admin via QR (admin wajib email + pass)
    if (profile.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Akun Admin wajib masuk menggunakan email dan password.'
      });
    }
    console.log(`[QR Login] token/profile valid ${Date.now() - startedAt}ms`);

    // 4. Generate session token Supabase menggunakan link sekali pakai (OTP / Magic Link)
    //    atau langsung generate token link login untuk user bersangkutan.
    //    Karena Supabase admin auth tidak langsung men-sign-in tanpa email/pass,
    //    kita gunakan Admin API untuk generate Magic Link, lalu kirim access_token-nya ke mobile app.
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
      options: {
        // Kita tidak benar-benar mengirim email, ini hanya generate link JWT sekali pakai di memori
        redirectTo: 'facework://login-callback'
      }
    });

    if (otpError || !otpData) {
      console.error('[Supabase OTP Link Error]', otpError);
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat sesi masuk otomatis.'
      });
    }
    console.log(`[QR Login] magic link generated ${Date.now() - startedAt}ms`);

    const otpTokenHash = otpData.properties?.hashed_token;
    const otpType = otpData.properties?.verification_type || 'magiclink';

    if (!otpTokenHash) {
      console.error('[Supabase OTP Link Error] hashed_token kosong', otpData.properties);
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat token sesi masuk otomatis.'
      });
    }

    // 5. Verifikasi OTP token langsung di backend untuk mengambil Session asli (access_token & refresh_token)
    const otpExchangeClient = createOtpExchangeClient();
    const { data: sessionData, error: sessionError } = await otpExchangeClient.auth.verifyOtp({
      token_hash: otpTokenHash,
      type: otpType
    });

    if (sessionError || !sessionData.session) {
      console.error('[Supabase Verify OTP Error]', sessionError);
      return res.status(500).json({
        success: false,
        message: 'Gagal menukarkan kode sesi.'
      });
    }
    console.log(`[QR Login] session verified ${Date.now() - startedAt}ms`);

    // 6. Setelah session valid, baru tandai QR terpakai.
    const { error: updateTokenError } = await supabaseAdmin
      .from('qr_login_tokens')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        used_device_id: device_id
      })
      .eq('id', tokenRecord.id)
      .eq('status', 'active');

    if (updateTokenError) throw updateTokenError;
    console.log(`[QR Login] token marked used ${Date.now() - startedAt}ms`);

    // 7. Daftarkan device sebagai best-effort. Login tidak boleh gagal hanya karena policy device belum siap.
    let deviceBindingStatus = 'saved';
    try {
      await supabaseAdmin
        .from('user_devices')
        .update({ is_active: false })
        .eq('employee_id', employeeId);

      const { error: deviceError } = await supabaseAdmin
        .from('user_devices')
        .upsert({
          employee_id: employeeId,
          device_id: device_id,
          device_name: device_name || 'Generic Device',
          platform: platform || 'unknown',
          app_version: app_version || '1.0.0',
          is_active: true,
          bound_via: 'qr_login',
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'employee_id,device_id'
        });

      if (deviceError) throw deviceError;
    } catch (deviceError) {
      deviceBindingStatus = 'skipped';
      console.warn('[QR Login Device Binding Warning]', deviceError);
    }

    // 8. Kunci device aktif karyawan di profiles sebagai best-effort.
    try {
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          active_device_id: device_id,
          device_bound_at: new Date().toISOString()
        })
        .eq('id', employeeId);

      if (updateProfileError) throw updateProfileError;
    } catch (profileDeviceError) {
      deviceBindingStatus = 'skipped';
      console.warn('[QR Login Profile Device Warning]', profileDeviceError);
    }

    // 9. Kirim data session Supabase asli ke Mobile App agar langsung login!
    console.log(`[QR Login] success ${Date.now() - startedAt}ms`);
    return res.json({
      success: true,
      message: 'QR Login sukses. Sesi berhasil dibuat.',
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        user: sessionData.user
      },
      data: {
        device_binding_status: deviceBindingStatus
      },
    });

  } catch (err) {
    console.error('[QR Login Public Route Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal server saat masuk via QR.'
    });
  }
});

module.exports = router;
