import React from 'react';

export const Badge = ({ type, children }) => {
  const getStyles = () => {
    switch (type) {
      // Status Kehadiran
      case 'hadir':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'terlambat':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'luar_geofence':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'fake_gps':
        return 'text-red-800 bg-red-100 border-red-300 font-bold animate-pulse';
      case 'absen':
        return 'text-slate-600 bg-slate-100 border-slate-300';

      // Tipe Presensi / Lokasi
      case 'office':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'field':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'remote':
        return 'text-purple-700 bg-purple-50 border-purple-200';

      // Status Wajah / Device / Token
      case 'registered':
      case 'active':
      case 'active_device':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'not_registered':
      case 'expired':
      case 'inactive_device':
        return 'text-slate-500 bg-slate-50 border-slate-200';
      case 'revoked':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'used':
        return 'text-blue-600 bg-blue-50 border-blue-200';

      // Role
      case 'admin':
        return 'text-violet-700 bg-violet-50 border-violet-200 font-semibold';
      case 'employee':
        return 'text-slate-600 bg-slate-100 border-slate-200';

      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
      {children}
    </span>
  );
};
