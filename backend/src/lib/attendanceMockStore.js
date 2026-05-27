const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const profiles = {
  'emp-1': {
    full_name: 'Budi Santoso',
    email: 'budi.santoso@presensia.co.id',
    department: 'IT & Engineering',
    position: 'Senior Flutter Developer',
    attendance_mode: 'office',
    office_location_name: 'Kantor Pusat (HQ)',
  },
  'emp-2': {
    full_name: 'Siti Rahma',
    email: 'siti.rahma@presensia.co.id',
    department: 'Marketing',
    position: 'Social Media Specialist',
    attendance_mode: 'office',
    office_location_name: 'Kantor Pusat (HQ)',
  },
  'emp-3': {
    full_name: 'Rian Hidayat',
    email: 'rian.hidayat@presensia.co.id',
    department: 'Sales',
    position: 'Account Executive',
    attendance_mode: 'field',
    office_location_name: 'Cabang Bandung',
  },
  'emp-5': {
    full_name: 'Joko Susilo',
    email: 'joko.susilo@presensia.co.id',
    department: 'IT & Engineering',
    position: 'System Administrator',
    attendance_mode: 'office',
    office_location_name: 'Cabang Bandung',
  },
};

const records = [
  {
    id: 'att-today-1',
    employee_id: 'emp-1',
    date: today,
    check_in: `${today}T08:15:22.000Z`,
    check_out: null,
    latitude: -6.175395,
    longitude: 106.82715,
    gps_accuracy_meters: 5.2,
    is_mock_location: false,
    geofence_status: 'inside',
    distance_from_office_meters: 12.5,
    face_similarity: 0.94,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=random',
    status: 'present',
    source: 'face_check_in',
  },
  {
    id: 'att-today-2',
    employee_id: 'emp-2',
    date: today,
    check_in: `${today}T09:30:15.000Z`,
    check_out: null,
    latitude: -6.17538,
    longitude: 106.82716,
    gps_accuracy_meters: 8.5,
    is_mock_location: false,
    geofence_status: 'inside',
    distance_from_office_meters: 25,
    face_similarity: 0.91,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Siti+Rahma&background=random',
    status: 'late',
    source: 'face_check_in',
  },
  {
    id: 'att-today-3',
    employee_id: 'emp-3',
    date: today,
    check_in: `${today}T08:45:00.000Z`,
    check_out: null,
    latitude: -6.2,
    longitude: 106.816666,
    gps_accuracy_meters: 12,
    is_mock_location: false,
    geofence_status: 'outside',
    distance_from_office_meters: 120500,
    face_similarity: 0.89,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Rian+Hidayat&background=random',
    status: 'present',
    source: 'field_check_in',
  },
  {
    id: 'att-today-5',
    employee_id: 'emp-5',
    date: today,
    check_in: `${today}T08:05:00.000Z`,
    check_out: null,
    latitude: -6.921857,
    longitude: 107.610111,
    gps_accuracy_meters: 1,
    is_mock_location: true,
    geofence_status: 'inside',
    distance_from_office_meters: 0.5,
    face_similarity: 0.95,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Joko+Susilo&background=random',
    status: 'fake_gps',
    source: 'face_check_in',
  },
  {
    id: 'att-yest-1',
    employee_id: 'emp-1',
    date: yesterday,
    check_in: `${yesterday}T08:20:00.000Z`,
    check_out: `${yesterday}T17:15:00.000Z`,
    latitude: -6.1754,
    longitude: 106.82715,
    gps_accuracy_meters: 10.5,
    is_mock_location: false,
    geofence_status: 'inside',
    distance_from_office_meters: 15,
    face_similarity: 0.96,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=random',
    status: 'present',
    source: 'face_check_in',
  },
  {
    id: 'att-yest-2',
    employee_id: 'emp-2',
    date: yesterday,
    check_in: `${yesterday}T08:50:00.000Z`,
    check_out: `${yesterday}T18:05:00.000Z`,
    latitude: -6.1755,
    longitude: 106.8281,
    gps_accuracy_meters: 15.5,
    is_mock_location: false,
    geofence_status: 'outside',
    distance_from_office_meters: 155,
    face_similarity: 0.88,
    face_threshold: 0.85,
    evidence_photo_url: 'https://ui-avatars.com/api/?name=Siti+Rahma&background=random',
    status: 'outside_geofence',
    source: 'face_check_in',
  },
];

function normalize(record) {
  const profile = profiles[record.employee_id] || {};

  return {
    ...record,
    employee_name: profile.full_name || 'Tanpa Nama',
    employee_email: profile.email || '',
    department: profile.department || '',
    position: profile.position || '',
    attendance_mode: profile.attendance_mode || 'office',
    office_location_name: profile.office_location_name || null,
  };
}

function listAttendance() {
  return records.map(normalize);
}

function getSummary() {
  const todayRecords = records.filter((record) => record.date === today);

  return {
    total: records.length,
    today: todayRecords.length,
    outsideGeofence: records.filter((record) => record.geofence_status === 'outside').length,
    fakeGps: records.filter((record) => record.is_mock_location).length,
    notCheckout: todayRecords.filter((record) => !record.check_out).length,
  };
}

module.exports = {
  listAttendance,
  getSummary,
};
