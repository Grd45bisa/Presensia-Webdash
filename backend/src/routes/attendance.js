const express = require('express');
const supabaseAdmin = require('../lib/supabaseAdmin');

const router = express.Router();

async function createEvidenceSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from('attendance-evidence')
    .createSignedUrl(path, 60 * 10);
  if (error) {
    console.warn('[Attendance Evidence Signed URL Warning]', error);
    return null;
  }
  return data?.signedUrl || null;
}

async function normalizeSupabaseRecord(row) {
  const profile = row.profiles || {};
  const office = row.office_locations || {};
  const evidenceInPath = row.evidence_photo_in_path || row.evidence_photo_path || null;
  const evidenceOutPath = row.evidence_photo_out_path || null;
  const evidencePath = evidenceOutPath || evidenceInPath;

  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_name: profile.full_name || 'Tanpa Nama',
    employee_email: profile.email || '',
    department: profile.department || '',
    position: profile.position || '',
    attendance_mode: profile.attendance_mode || 'office',
    office_location_name: office.name || null,
    date: row.date,
    check_in: row.check_in,
    check_out: row.check_out,
    latitude: row.latitude,
    longitude: row.longitude,
    gps_accuracy_meters: row.gps_accuracy_meters,
    is_mock_location: Boolean(row.is_mock_location),
    geofence_status: row.geofence_status || 'not_checked',
    distance_from_office_meters: row.distance_from_office_meters,
    face_similarity: row.face_similarity,
    face_threshold: row.face_threshold,
    evidence_photo_path: evidencePath,
    evidence_photo_in_path: evidenceInPath,
    evidence_photo_out_path: evidenceOutPath,
    evidence_photo_url: await createEvidenceSignedUrl(evidencePath),
    evidence_photo_in_url: await createEvidenceSignedUrl(evidenceInPath),
    evidence_photo_out_url: await createEvidenceSignedUrl(evidenceOutPath),
    status: row.status || 'present',
    source: row.source || 'manual',
  };
}

function buildSummary(records) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((record) => record.date === today);

  return {
    total: records.length,
    today: todayRecords.length,
    outsideGeofence: records.filter((record) => record.geofence_status === 'outside').length,
    fakeGps: records.filter((record) => record.is_mock_location).length,
    notCheckout: todayRecords.filter((record) => !record.check_out).length,
  };
}

async function listFromSupabase() {
  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .select(`
      id,
      employee_id,
      date,
      source,
      status,
      check_in,
      check_out,
      latitude,
      longitude,
      gps_accuracy_meters,
      is_mock_location,
      geofence_status,
      distance_from_office_meters,
      face_similarity,
      face_threshold,
      evidence_photo_path,
      evidence_photo_in_path,
      evidence_photo_out_path,
      profiles:employee_id (
        full_name,
        email,
        department,
        position,
        attendance_mode
      ),
      office_locations:office_location_id (
        name
      )
    `)
    .order('date', { ascending: false })
    .order('check_in', { ascending: false });

  if (error) throw error;
  return Promise.all((data || []).map(normalizeSupabaseRecord));
}

router.get('/', async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Supabase backend belum dikonfigurasi.',
    });
  }

  try {
    const records = await listFromSupabase();

    return res.json({
      success: true,
      data: {
        source: 'supabase',
        records,
        summary: buildSummary(records),
      },
    });
  } catch (err) {
    console.error('[Attendance GET Error]', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membaca data presensi dari Supabase.',
      error: err.message,
    });
  }
});

module.exports = router;
