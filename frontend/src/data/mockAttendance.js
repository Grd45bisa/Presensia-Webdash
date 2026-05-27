import { format, subDays } from 'date-fns';

const today = new Date();
const formattedToday = format(today, 'yyyy-MM-dd');
const formattedYesterday = format(subDays(today, 1), 'yyyy-MM-dd');

export const mockAttendance = [
  // HARI INI
  {
    id: "att-today-1",
    profile_id: "emp-1", // Budi (Office HQ) - Tepat Waktu
    tanggal: formattedToday,
    check_in: `${formattedToday}T08:15:22.000Z`,
    check_out: null,
    latitude_in: -6.175395,
    longitude_in: 106.827150, // Sangat dekat HQ
    latitude_out: null,
    longitude_out: null,
    gps_accuracy_in: 5.2,
    gps_accuracy_out: null,
    is_mock_location_in: false,
    is_mock_location_out: false,
    is_inside_geofence_in: true,
    is_inside_geofence_out: false,
    distance_from_office_in: 12.5,
    distance_from_office_out: null,
    face_similarity_score_in: 0.94,
    face_similarity_score_out: null,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Budi+Santoso&background=random",
    evidence_photo_out_url: null,
    status: "hadir"
  },
  {
    id: "att-today-2",
    profile_id: "emp-2", // Siti (Office HQ) - Terlambat
    tanggal: formattedToday,
    check_in: `${formattedToday}T09:30:15.000Z`,
    check_out: null,
    latitude_in: -6.175380,
    longitude_in: 106.827160,
    latitude_out: null,
    longitude_out: null,
    gps_accuracy_in: 8.5,
    gps_accuracy_out: null,
    is_mock_location_in: false,
    is_mock_location_out: false,
    is_inside_geofence_in: true,
    is_inside_geofence_out: false,
    distance_from_office_in: 25.0,
    distance_from_office_out: null,
    face_similarity_score_in: 0.91,
    face_similarity_score_out: null,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Siti+Rahma&background=random",
    evidence_photo_out_url: null,
    status: "terlambat"
  },
  {
    id: "att-today-3",
    profile_id: "emp-3", // Rian (Field) - Di Luar Geofence, tapi Boleh
    tanggal: formattedToday,
    check_in: `${formattedToday}T08:45:00.000Z`,
    check_out: null,
    latitude_in: -6.200000,
    longitude_in: 106.816666, // Jauh dari cabang bandung, karena lagi di jakarta
    latitude_out: null,
    longitude_out: null,
    gps_accuracy_in: 12.0,
    gps_accuracy_out: null,
    is_mock_location_in: false,
    is_mock_location_out: false,
    is_inside_geofence_in: false,
    is_inside_geofence_out: false,
    distance_from_office_in: 120500, // 120km
    distance_from_office_out: null,
    face_similarity_score_in: 0.89,
    face_similarity_score_out: null,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Rian+Hidayat&background=random",
    evidence_photo_out_url: null,
    status: "hadir"
  },
  {
    id: "att-today-5",
    profile_id: "emp-5", // Joko (Office BDG) - Fake GPS Detected
    tanggal: formattedToday,
    check_in: `${formattedToday}T08:05:00.000Z`,
    check_out: null,
    latitude_in: -6.921857,
    longitude_in: 107.610111, // Koordinat persis HQ BDG (Mencurigakan terlalu presisi)
    latitude_out: null,
    longitude_out: null,
    gps_accuracy_in: 1.0,
    gps_accuracy_out: null,
    is_mock_location_in: true, // TERDETEKSI FAKE GPS
    is_mock_location_out: false,
    is_inside_geofence_in: true,
    is_inside_geofence_out: false,
    distance_from_office_in: 0.5,
    distance_from_office_out: null,
    face_similarity_score_in: 0.95,
    face_similarity_score_out: null,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Joko+Susilo&background=random",
    evidence_photo_out_url: null,
    status: "fake_gps"
  },

  // KEMARIN
  {
    id: "att-yest-1",
    profile_id: "emp-1", // Budi
    tanggal: formattedYesterday,
    check_in: `${formattedYesterday}T08:20:00.000Z`,
    check_out: `${formattedYesterday}T17:15:00.000Z`,
    latitude_in: -6.175400,
    longitude_in: 106.827150,
    latitude_out: -6.175390,
    longitude_out: 106.827160,
    gps_accuracy_in: 10.5,
    gps_accuracy_out: 8.2,
    is_mock_location_in: false,
    is_mock_location_out: false,
    is_inside_geofence_in: true,
    is_inside_geofence_out: true,
    distance_from_office_in: 15.0,
    distance_from_office_out: 11.2,
    face_similarity_score_in: 0.96,
    face_similarity_score_out: 0.92,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Budi+Santoso&background=random",
    evidence_photo_out_url: "https://ui-avatars.com/api/?name=Budi+Santoso&background=random",
    status: "hadir"
  },
  {
    id: "att-yest-2",
    profile_id: "emp-2", // Siti
    tanggal: formattedYesterday,
    check_in: `${formattedYesterday}T08:50:00.000Z`,
    check_out: `${formattedYesterday}T18:05:00.000Z`,
    latitude_in: -6.175500, // Di luar radius HQ (radius 100m, dia di luar 120m)
    longitude_in: 106.828100,
    latitude_out: -6.175380,
    longitude_out: 106.827160,
    gps_accuracy_in: 15.5,
    gps_accuracy_out: 7.2,
    is_mock_location_in: false,
    is_mock_location_out: false,
    is_inside_geofence_in: false, // Pelanggaran geofence saat in
    is_inside_geofence_out: true,
    distance_from_office_in: 155.0, // Melebihi radius 100m
    distance_from_office_out: 25.0,
    face_similarity_score_in: 0.88,
    face_similarity_score_out: 0.94,
    evidence_photo_in_url: "https://ui-avatars.com/api/?name=Siti+Rahma&background=random",
    evidence_photo_out_url: "https://ui-avatars.com/api/?name=Siti+Rahma&background=random",
    status: "luar_geofence"
  }
];
