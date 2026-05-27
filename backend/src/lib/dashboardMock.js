const summaryCards = [
  {
    title: 'Total Karyawan',
    value: 128,
    detail: '128 akun aktif',
    color: 'blue',
    icon: 'users',
  },
  {
    title: 'Hadir Hari Ini',
    value: 96,
    detail: '75,00% dari total',
    color: 'emerald',
    icon: 'userRoundCheck',
  },
  {
    title: 'Belum Presensi',
    value: 32,
    detail: '25,00% dari total',
    color: 'amber',
    icon: 'clock',
  },
  {
    title: 'Di Luar Geofence',
    value: 5,
    detail: '3,91% perlu ditinjau',
    color: 'rose',
    icon: 'mapPin',
  },
  {
    title: 'Indikasi Fake GPS',
    value: 2,
    detail: '1,56% risiko tinggi',
    color: 'red',
    icon: 'locateFixed',
  },
];

const attendanceRates = [
  82, 75, 88, 86, 78, 84, 90, 87, 85, 88, 91, 84, 80, 82, 86, 88, 83, 74, 85, 78, 90,
];

const trendData = attendanceRates.map((rate, index) => {
  const total = 128;
  const hadir = Math.round((rate / 100) * total);

  return {
    day: index + 1,
    date: `${String(index + 1).padStart(2, '0')} Mei 2026`,
    hadir,
    belumPresensi: total - hadir,
    tingkatKehadiran: rate,
  };
});

const latestAttendance = [
  { name: 'Budi Santoso', role: 'Developer', time: '08:45', score: '96.4%', status: 'Hadir' },
  { name: 'Siti Rahmawati', role: 'Marketing', time: '08:42', score: '94.1%', status: 'Hadir' },
  { name: 'Andi Wijaya', role: 'Sales Executive', time: '08:40', score: '92.7%', status: 'Hadir' },
  { name: 'Dewi Lestari', role: 'HR Generalist', time: '08:37', score: '95.8%', status: 'Hadir' },
  { name: 'Rizky Pratama', role: 'Field Engineer', time: '08:35', score: '91.3%', status: 'Lapangan' },
];

const tableRows = [
  {
    name: 'Budi Santoso',
    type: 'office',
    checkIn: '08:45',
    checkOut: '-',
    location: 'Kantor Pusat - Jakarta',
    geofence: 'inside',
    score: '96.4%',
    status: 'Belum Check-out',
  },
  {
    name: 'Siti Rahmawati',
    type: 'office',
    checkIn: '08:42',
    checkOut: '17:30',
    location: 'Kantor Pusat - Jakarta',
    geofence: 'inside',
    score: '94.1%',
    status: 'Selesai',
  },
  {
    name: 'Andi Wijaya',
    type: 'office',
    checkIn: '08:40',
    checkOut: '17:28',
    location: 'Kantor Pusat - Jakarta',
    geofence: 'inside',
    score: '92.7%',
    status: 'Selesai',
  },
  {
    name: 'Dewi Lestari',
    type: 'remote',
    checkIn: '09:02',
    checkOut: '-',
    location: 'Remote - Bekasi',
    geofence: 'inside',
    score: '95.8%',
    status: 'Belum Check-out',
  },
  {
    name: 'Rizky Pratama',
    type: 'field',
    checkIn: '07:58',
    checkOut: '-',
    location: 'Site Project - Bandung',
    geofence: 'outside',
    score: '91.3%',
    status: 'Belum Check-out',
  },
  {
    name: 'Fajar Nugroho',
    type: 'office',
    checkIn: '08:55',
    checkOut: '17:12',
    location: 'Kantor Pusat - Jakarta',
    geofence: 'inside',
    score: '93.6%',
    status: 'Selesai',
  },
  {
    name: 'Nurul Aini',
    type: 'remote',
    checkIn: '09:10',
    checkOut: '-',
    location: 'Remote - Yogyakarta',
    geofence: 'inside',
    score: '94.2%',
    status: 'Belum Check-out',
  },
];

function getMockDashboardData() {
  return {
    source: 'mock',
    generatedAt: new Date().toISOString(),
    summaryCards,
    trendData,
    latestAttendance,
    tableRows,
    pagination: {
      from: 1,
      to: 10,
      total: 128,
      currentPage: 1,
      lastPage: 13,
    },
  };
}

module.exports = { getMockDashboardData };
