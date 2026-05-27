import { format, subDays } from 'date-fns';

const today = new Date();
const formattedToday = format(today, 'yyyy-MM-dd');
const formattedYesterday = format(subDays(today, 1), 'yyyy-MM-dd');

export const mockWorklogs = [
  {
    id: "wl-1",
    profile_id: "emp-1", // Budi
    tanggal: formattedYesterday,
    project_name: "Presensia Mobile App",
    task: "Integrasi Google ML Kit Face Detection dan test akurasi embedding di local SQLite.",
    start_time: "08:30",
    end_time: "12:00",
    durasi_menit: 210
  },
  {
    id: "wl-2",
    profile_id: "emp-1", // Budi
    tanggal: formattedYesterday,
    project_name: "Presensia Mobile App",
    task: "Penyempurnaan kalender absensi bulanan dan export laporan kehadiran ke PDF.",
    start_time: "13:00",
    end_time: "17:00",
    durasi_menit: 240
  },
  {
    id: "wl-3",
    profile_id: "emp-2", // Siti
    tanggal: formattedYesterday,
    project_name: "Presensia Marketing",
    task: "Membuat materi promosi sosial media untuk launching sistem presensi baru.",
    start_time: "09:00",
    end_time: "15:30",
    durasi_menit: 390
  },
  {
    id: "wl-4",
    profile_id: "emp-3", // Rian
    tanggal: formattedYesterday,
    project_name: "Sales Outreach",
    task: "Bimbingan dan pitching demo aplikasi presensi wajah ke klien potensial.",
    start_time: "10:00",
    end_time: "16:00",
    durasi_menit: 360
  }
];
