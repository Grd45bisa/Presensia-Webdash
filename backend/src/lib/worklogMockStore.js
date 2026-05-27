const employeeStore = require('./employeeMockStore');

function isoAt(date, hour, minute) {
  const value = new Date(`${date}T00:00:00.000+07:00`);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

function dayOffset(days) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

let worklogs = [
  {
    id: 'wl-1',
    employee_id: 'emp-1',
    date: dayOffset(0),
    task_name: 'Integrasi QR Login dengan device binding mobile.',
    project_name: 'Presensia Mobile App',
    project_color: '#2563EB',
    start_time: isoAt(dayOffset(0), 8, 30),
    end_time: isoAt(dayOffset(0), 11, 45),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wl-2',
    employee_id: 'emp-1',
    date: dayOffset(0),
    task_name: 'Testing validasi geofence dan skenario fake GPS.',
    project_name: 'Presensia Mobile App',
    project_color: '#2563EB',
    start_time: isoAt(dayOffset(0), 13, 0),
    end_time: isoAt(dayOffset(0), 16, 20),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wl-3',
    employee_id: 'emp-2',
    date: dayOffset(0),
    task_name: 'Menyiapkan materi komunikasi internal untuk rollout presensi.',
    project_name: 'HR Campaign',
    project_color: '#DB2777',
    start_time: isoAt(dayOffset(0), 9, 0),
    end_time: isoAt(dayOffset(0), 12, 30),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'wl-4',
    employee_id: 'emp-3',
    date: dayOffset(-1),
    task_name: 'Demo sistem presensi ke calon klien dan follow up kebutuhan lapangan.',
    project_name: 'Sales Outreach',
    project_color: '#F59E0B',
    start_time: isoAt(dayOffset(-1), 10, 0),
    end_time: isoAt(dayOffset(-1), 16, 0),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'wl-5',
    employee_id: 'emp-5',
    date: dayOffset(-2),
    task_name: 'Maintenance server staging dan pengecekan backup database.',
    project_name: 'Infrastructure',
    project_color: '#0F766E',
    start_time: isoAt(dayOffset(-2), 8, 15),
    end_time: isoAt(dayOffset(-2), 14, 45),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

function withEmployee(row) {
  const employee = employeeStore.listEmployees().find((item) => item.id === row.employee_id);

  return {
    ...row,
    employee_name: employee?.full_name || '-',
    employee_email: employee?.email || '-',
    department: employee?.department || '-',
    position: employee?.position || '-',
  };
}

function listWorklogs({ from, to, employeeId, project } = {}) {
  return worklogs
    .filter((row) => !from || row.date >= from)
    .filter((row) => !to || row.date <= to)
    .filter((row) => !employeeId || row.employee_id === employeeId)
    .filter((row) => !project || row.project_name === project)
    .map(withEmployee)
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return String(b.start_time || '').localeCompare(String(a.start_time || ''));
    });
}

module.exports = {
  listWorklogs,
};
