const supabaseAdmin = require('../lib/supabaseAdmin');

async function verifyAdmin(req, res, next) {
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Supabase admin belum dikonfigurasi di backend.'
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token otentikasi tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verifikasi JWT Token dengan Supabase Auth
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, message: 'Sesi tidak valid atau telah berakhir.' });
    }

    // 2. Cek apakah user bersangkutan memiliki role 'admin' di tabel profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Profil Anda tidak ditemukan.' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Anda tidak memiliki hak akses admin.' });
    }

    // Tempelkan data user ke request
    req.user = user;
    next();
  } catch (err) {
    console.error('[verifyAdmin Middleware Error]', err);
    return res.status(500).json({ success: false, message: 'Gagal memproses otentikasi admin.' });
  }
}

module.exports = verifyAdmin;
