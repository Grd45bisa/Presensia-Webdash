import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', onClick }) => {
  const colors = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'border-amber-100',
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'border-rose-100',
    },
    slate: {
      bg: 'bg-slate-50',
      icon: 'text-slate-500',
      border: 'border-slate-100',
    },
  };

  const c = colors[color] || colors.blue;

  return (
    <div
      className={`bg-white rounded-xl border ${c.border} p-5 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`ml-4 flex-shrink-0 p-2.5 rounded-lg ${c.bg}`}>
            <Icon size={22} className={c.icon} />
          </div>
        )}
      </div>
    </div>
  );
};
