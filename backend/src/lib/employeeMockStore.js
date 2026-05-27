const offices = [
  {
    id: 'office-islamic-raya',
    name: 'Kantor Islamic Raya',
    address: 'Universitas Cendekia Abditama, Jl. Islamic Raya, Klp. Dua, Kecamatan Kelapa Dua, Kabupaten Tangerang, Banten 15811',
    latitude: -6.227905,
    longitude: 106.6167849,
    radius_meters: 100,
    is_active: true,
    maps_url: 'https://maps.app.goo.gl/V9ZZosTkcAp7q93x8',
  },
  {
    id: 'office-branch-bdg',
    name: 'Cabang Bandung',
    address: 'Jl. Asia Afrika No. 45, Bandung',
    latitude: -6.921552,
    longitude: 107.607425,
    radius_meters: 100,
    is_active: true,
  },
  {
    id: 'office-branch-sby',
    name: 'Cabang Surabaya',
    address: 'Jl. Tunjungan No. 88, Surabaya',
    latitude: -7.257472,
    longitude: 112.752088,
    radius_meters: 100,
    is_active: false,
  },
];

let employees = [
  {
    id: 'emp-1',
    full_name: 'Budi Santoso',
    email: 'budi.santoso@presensia.co.id',
    phone_number: '082345678901',
    department: 'IT & Engineering',
    position: 'Senior Flutter Developer',
    role: 'employee',
    attendance_mode: 'office',
    office_location_id: 'office-islamic-raya',
    office_location_name: 'Kantor Islamic Raya',
    can_attend_outside_office: false,
    face_status: 'registered',
    active_device_id: 'dev-budi-1',
    device_status: 'active',
    created_at: '2026-02-15T09:00:00.000Z',
  },
  {
    id: 'emp-2',
    full_name: 'Siti Rahmawati',
    email: 'siti.rahmawati@presensia.co.id',
    phone_number: '083456789012',
    department: 'Marketing',
    position: 'Marketing Specialist',
    role: 'employee',
    attendance_mode: 'office',
    office_location_id: 'office-islamic-raya',
    office_location_name: 'Kantor Islamic Raya',
    can_attend_outside_office: false,
    face_status: 'registered',
    active_device_id: 'dev-siti-1',
    device_status: 'active',
    created_at: '2026-03-01T08:30:00.000Z',
  },
  {
    id: 'emp-3',
    full_name: 'Rian Hidayat',
    email: 'rian.hidayat@presensia.co.id',
    phone_number: '084567890123',
    department: 'Sales',
    position: 'Account Executive',
    role: 'employee',
    attendance_mode: 'field',
    office_location_id: 'office-branch-bdg',
    office_location_name: 'Cabang Bandung',
    can_attend_outside_office: true,
    face_status: 'registered',
    active_device_id: 'dev-rian-1',
    device_status: 'active',
    created_at: '2026-03-20T08:45:00.000Z',
  },
  {
    id: 'emp-4',
    full_name: 'Dewi Lestari',
    email: 'dewi.lestari@presensia.co.id',
    phone_number: '085678901234',
    department: 'Design',
    position: 'UI/UX Designer',
    role: 'employee',
    attendance_mode: 'remote',
    office_location_id: null,
    office_location_name: null,
    can_attend_outside_office: true,
    face_status: 'not_registered',
    active_device_id: null,
    device_status: 'inactive',
    created_at: '2026-05-10T10:00:00.000Z',
  },
  {
    id: 'emp-5',
    full_name: 'Joko Susilo',
    email: 'joko.susilo@presensia.co.id',
    phone_number: '086789012345',
    department: 'IT & Engineering',
    position: 'System Administrator',
    role: 'employee',
    attendance_mode: 'office',
    office_location_id: 'office-islamic-raya',
    office_location_name: 'Kantor Islamic Raya',
    can_attend_outside_office: false,
    face_status: 'registered',
    active_device_id: 'dev-joko-1',
    device_status: 'active',
    created_at: '2026-04-05T09:15:00.000Z',
  },
];

function attachOfficeName(employee) {
  const office = offices.find((item) => item.id === employee.office_location_id);

  return {
    ...employee,
    office_location_name: office?.name || null,
    device_status: employee.active_device_id ? 'active' : 'inactive',
  };
}

function listEmployees() {
  return employees.map(attachOfficeName);
}

function createEmployee(payload) {
  const id = `emp-${Date.now()}`;
  const employee = attachOfficeName({
    id,
    full_name: payload.full_name,
    email: payload.email,
    phone_number: payload.phone_number || '',
    department: payload.department || '',
    position: payload.position || '',
    role: payload.role || 'employee',
    attendance_mode: payload.attendance_mode || 'office',
    office_location_id: payload.office_location_id || null,
    can_attend_outside_office: Boolean(payload.can_attend_outside_office),
    face_status: 'not_registered',
    active_device_id: payload.active_device_id || null,
    created_at: new Date().toISOString(),
  });

  employees = [employee, ...employees];
  return employee;
}

function updateEmployee(id, payload) {
  let updatedEmployee = null;

  employees = employees.map((employee) => {
    if (employee.id !== id) return employee;

    updatedEmployee = attachOfficeName({
      ...employee,
      ...payload,
      face_status: employee.face_status,
      office_location_id: payload.office_location_id || null,
      can_attend_outside_office: Boolean(payload.can_attend_outside_office),
      updated_at: new Date().toISOString(),
    });

    return updatedEmployee;
  });

  return updatedEmployee;
}

function deleteEmployee(id) {
  const before = employees.length;
  employees = employees.filter((employee) => employee.id !== id);
  return employees.length < before;
}

function setActiveDevice(employeeId, deviceId) {
  let updatedEmployee = null;

  employees = employees.map((employee) => {
    if (employee.id !== employeeId) return employee;

    updatedEmployee = attachOfficeName({
      ...employee,
      active_device_id: deviceId || null,
      device_bound_at: deviceId ? new Date().toISOString() : null,
    });

    return updatedEmployee;
  });

  return updatedEmployee;
}

module.exports = {
  offices,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  setActiveDevice,
};
