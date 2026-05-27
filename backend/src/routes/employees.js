const express = require('express');
const router = express.Router();
const supabaseAdmin = require('../lib/supabaseAdmin');
const mockStore = require('../lib/employeeMockStore');

function normalizeEmployee(row) {
  const office = row.office_locations || {};
  const faceEmbedding = Array.isArray(row.face_embeddings)
    ? row.face_embeddings[0]
    : row.face_embeddings;
  const hasFaceEnrollment = Boolean(faceEmbedding?.face_enrollment_at || row.face_enrollment_at);

  return {
    id: row.id,
    full_name: row.full_name || '',
    email: row.email || '',
    phone_number: row.phone_number || '',
    department: row.department || '',
    position: row.position || '',
    role: row.role || 'employee',
    attendance_mode: row.attendance_mode || 'office',
    office_location_id: row.office_location_id || null,
    office_location_name: office.name || null,
    can_attend_outside_office: Boolean(row.can_attend_outside_office),
    face_status: hasFaceEnrollment ? 'registered' : (row.face_status || row.status_wajah || 'not_registered'),
    face_enrollment_at: faceEmbedding?.face_enrollment_at || row.face_enrollment_at || null,
    active_device_id: row.active_device_id || null,
    device_status: row.active_device_id ? 'active' : 'inactive',
    created_at: row.created_at,
  };
}

async function listFromSupabase() {
  const selectWithFaceEnrollment = `
    id,
    full_name,
    email,
    phone_number,
    department,
    position,
    role,
    attendance_mode,
    office_location_id,
    can_attend_outside_office,
    active_device_id,
    face_enrollment_at,
    created_at,
    office_locations:office_location_id (
      name
    )
  `;
  const selectBase = `
    id,
    full_name,
    email,
    phone_number,
    department,
    position,
    role,
    attendance_mode,
    office_location_id,
    can_attend_outside_office,
    active_device_id,
    face_embeddings (
      face_enrollment_at
    ),
    created_at,
    office_locations:office_location_id (
      name
    )
  `;

  let { data, error } = await supabaseAdmin
    .from('profiles')
    .select(selectWithFaceEnrollment)
    .order('created_at', { ascending: false });

  if (error && (error.message?.includes('face_enrollment_at') || error.message?.includes('face_embeddings'))) {
    const fallback = await supabaseAdmin
      .from('profiles')
      .select(selectBase)
      .order('created_at', { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data || []).map(normalizeEmployee);
}

async function listOfficesFromSupabase() {
  const { data, error } = await supabaseAdmin
    .from('office_locations')
    .select('id, name, address, is_active')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.json({
      success: true,
      data: {
        source: 'mock',
        employees: mockStore.listEmployees(),
        offices: mockStore.offices,
      },
    });
  }

  try {
    const [employees, offices] = await Promise.all([
      listFromSupabase(),
      listOfficesFromSupabase(),
    ]);

    return res.json({
      success: true,
      data: {
        source: 'supabase',
        employees,
        offices,
      },
    });
  } catch (err) {
    console.error('[Employees GET Fallback]', err);
    return res.json({
      success: true,
      data: {
        source: 'mock',
        fallbackReason: 'Gagal membaca Supabase, memakai data mock.',
        employees: mockStore.listEmployees(),
        offices: mockStore.offices,
      },
    });
  }
});

router.post('/', async (req, res) => {
  const {
    email,
    password,
    full_name,
    phone_number,
    department,
    position,
    role,
    attendance_mode,
    office_location_id,
    can_attend_outside_office,
  } = req.body;

  if (!email || !full_name) {
    return res.status(400).json({
      success: false,
      message: 'Email dan nama lengkap wajib diisi.',
    });
  }

  if (!supabaseAdmin) {
    const employee = mockStore.createEmployee(req.body);
    return res.status(201).json({
      success: true,
      message: 'Karyawan mock berhasil ditambahkan.',
      data: employee,
    });
  }

  try {
    const internalPassword = password || `Presensia-${cryptoRandomPassword()}`;
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: internalPassword,
      email_confirm: true,
      user_metadata: {
        login_method: 'qr_only',
        created_from: 'admin_dashboard',
      },
    });

    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }

    const newUserId = authData.user.id;

    const { data, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name,
        phone_number: phone_number || null,
        department: department || null,
        position: position || null,
        role: role || 'employee',
        attendance_mode: attendance_mode || 'office',
        office_location_id: office_location_id || null,
        can_attend_outside_office: can_attend_outside_office !== undefined ? can_attend_outside_office : false,
      })
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return res.status(500).json({
        success: false,
        message: 'Gagal membuat profil karyawan. Akun auth di-rollback.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Karyawan berhasil didaftarkan.',
      data: normalizeEmployee(data),
    });
  } catch (err) {
    console.error('[Create Employee Route Error]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const payload = {
    full_name: req.body.full_name,
    phone_number: req.body.phone_number,
    department: req.body.department,
    position: req.body.position,
    role: req.body.role,
    attendance_mode: req.body.attendance_mode,
    office_location_id: req.body.office_location_id || null,
    can_attend_outside_office: req.body.can_attend_outside_office !== undefined
      ? req.body.can_attend_outside_office
      : false,
  };

  if (!supabaseAdmin) {
    const employee = mockStore.updateEmployee(id, payload);

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    }

    return res.json({
      success: true,
      message: 'Profil karyawan mock berhasil diperbarui.',
      data: employee,
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      message: 'Profil karyawan berhasil diperbarui.',
      data: normalizeEmployee(data),
    });
  } catch (err) {
    console.error('[Update Employee Route Error]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!supabaseAdmin) {
    const deleted = mockStore.deleteEmployee(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    }

    return res.json({ success: true, message: 'Karyawan mock berhasil dihapus.' });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, message: 'Akun karyawan berhasil dihapus.' });
  } catch (err) {
    console.error('[Delete Employee Route Error]', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem.' });
  }
});

function cryptoRandomPassword() {
  return require('crypto').randomBytes(18).toString('base64url');
}

module.exports = router;
