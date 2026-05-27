import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';

import MainLayout from '@/components/layout/MainLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import KaryawanPage from '@/pages/KaryawanPage';
import PresensiPage from '@/pages/PresensiPage';
import PengaturanPage from '@/pages/PengaturanPage';
import LokasiKantorPage from '@/pages/LokasiKantorPage';
import QrLoginPage from '@/pages/QrLoginPage';
import DevicesPage from '@/pages/DevicesPage';
import WorklogPage from '@/pages/WorklogPage';
import LaporanPage from '@/pages/LaporanPage';

export default function App() {
  // Sementara mock session/profile agar dashboard bisa diuji/ditampilkan sebelum integrasi Supabase
  const [session, setSession] = useState({ user: { email: 'admin@presensia.com' } });
  const [profile, setProfile] = useState({ full_name: 'Super Admin HR' });
  const location = useLocation();

  const handleLoginSuccess = (user, userProfile) => {
    setSession({ user });
    setProfile(userProfile);
  };

  const handleLogout = async () => {
    // Supabase auth signout di-comment sementara agar mock session tidak hilang jika diklik
    // await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  // Peta judul halaman berdasarkan pathname
  const getPageTitle = (path) => {
    const titleMap = {
      '/': 'Dashboard',
      '/karyawan': 'Manajemen Karyawan',
      '/presensi': 'Riwayat Presensi Harian',
      '/lokasi-kantor': 'Lokasi Kantor & Geofence',
      '/qr-login': 'Secure QR Login',
      '/devices': 'Manajemen Perangkat',
      '/worklog': 'Aktivitas Worklog',
      '/laporan': 'Laporan & Ekspor',
      '/pengaturan': 'Pengaturan Global',
    };
    return titleMap[path] || 'Presensia Admin';
  };

  if (!session) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <MainLayout
      onLogout={handleLogout}
      adminName={profile?.full_name || session.user.email}
      title={getPageTitle(location.pathname)}
    >
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/karyawan" element={<KaryawanPage />} />
        <Route path="/presensi" element={<PresensiPage />} />
        <Route path="/lokasi-kantor" element={<LokasiKantorPage />} />
        <Route path="/qr-login" element={<QrLoginPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/worklog" element={<WorklogPage />} />
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="/pengaturan" element={<PengaturanPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}
