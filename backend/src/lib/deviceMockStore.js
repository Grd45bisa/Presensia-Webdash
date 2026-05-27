const employeeStore = require('./employeeMockStore');

let devices = [
  {
    id: 'device-1',
    employee_id: 'emp-1',
    device_id: 'dev-budi-1',
    device_name: 'Samsung Galaxy A55',
    platform: 'android',
    app_version: '1.0.0',
    is_active: true,
    bound_via: 'qr_login',
    last_seen_at: new Date(Date.now() - 70 * 1000).toISOString(),
    created_at: '2026-05-26T08:05:00.000Z',
    updated_at: new Date(Date.now() - 70 * 1000).toISOString(),
  },
  {
    id: 'device-2',
    employee_id: 'emp-2',
    device_id: 'dev-siti-1',
    device_name: 'iPhone 13',
    platform: 'ios',
    app_version: '1.0.0',
    is_active: true,
    bound_via: 'qr_login',
    last_seen_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    created_at: '2026-05-26T09:10:00.000Z',
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
  {
    id: 'device-3',
    employee_id: 'emp-3',
    device_id: 'dev-rian-1',
    device_name: 'OPPO Reno 10',
    platform: 'android',
    app_version: '1.0.0',
    is_active: false,
    bound_via: 'qr_login',
    last_seen_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: '2026-05-20T11:30:00.000Z',
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function withEmployee(device) {
  const employee = employeeStore.listEmployees().find((item) => item.id === device.employee_id);

  return {
    ...device,
    employee_name: employee?.full_name || '-',
    employee_email: employee?.email || '-',
    is_current_device: employee?.active_device_id === device.device_id,
  };
}

function listDevices() {
  return devices
    .map(withEmployee)
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
}

function upsertDevice(payload) {
  const now = new Date().toISOString();
  const existing = devices.find((device) => (
    device.employee_id === payload.employee_id && device.device_id === payload.device_id
  ));

  devices = devices.map((device) => (
    device.employee_id === payload.employee_id
      ? { ...device, is_active: false, updated_at: now }
      : device
  ));

  if (existing) {
    devices = devices.map((device) => {
      if (device.id !== existing.id) return device;
      return {
        ...device,
        device_name: payload.device_name || device.device_name,
        platform: payload.platform || device.platform,
        app_version: payload.app_version || device.app_version,
        is_active: true,
        bound_via: payload.bound_via || device.bound_via || 'qr_login',
        last_seen_at: now,
        updated_at: now,
      };
    });
  } else {
    devices = [
      {
        id: `device-${Date.now()}`,
        employee_id: payload.employee_id,
        device_id: payload.device_id,
        device_name: payload.device_name || 'Unknown Device',
        platform: payload.platform || 'unknown',
        app_version: payload.app_version || '1.0.0',
        is_active: true,
        bound_via: payload.bound_via || 'qr_login',
        last_seen_at: now,
        created_at: now,
        updated_at: now,
      },
      ...devices,
    ];
  }

  employeeStore.setActiveDevice(payload.employee_id, payload.device_id);
  return listDevices().find((device) => device.employee_id === payload.employee_id && device.device_id === payload.device_id);
}

function heartbeat(employeeId, deviceId, payload = {}) {
  const now = new Date().toISOString();
  let updated = null;

  devices = devices.map((device) => {
    if (device.employee_id !== employeeId || device.device_id !== deviceId) return device;

    updated = {
      ...device,
      device_name: payload.device_name || device.device_name,
      platform: payload.platform || device.platform,
      app_version: payload.app_version || device.app_version,
      is_active: true,
      last_seen_at: now,
      updated_at: now,
    };
    return updated;
  });

  return updated ? withEmployee(updated) : null;
}

function deactivateDevice(employeeId, deviceId) {
  const now = new Date().toISOString();
  let updated = null;

  devices = devices.map((device) => {
    if (device.employee_id !== employeeId || device.device_id !== deviceId) return device;

    updated = {
      ...device,
      is_active: false,
      updated_at: now,
    };
    return updated;
  });

  const activeDevice = employeeStore.listEmployees().find((employee) => employee.id === employeeId)?.active_device_id;
  if (activeDevice === deviceId) {
    employeeStore.setActiveDevice(employeeId, null);
  }

  return updated ? withEmployee(updated) : null;
}

function resetEmployeeDevices(employeeId) {
  const now = new Date().toISOString();
  let count = 0;

  devices = devices.map((device) => {
    if (device.employee_id !== employeeId) return device;
    count += 1;
    return {
      ...device,
      is_active: false,
      updated_at: now,
    };
  });

  employeeStore.setActiveDevice(employeeId, null);
  return count;
}

module.exports = {
  listDevices,
  upsertDevice,
  heartbeat,
  deactivateDevice,
  resetEmployeeDevices,
};
