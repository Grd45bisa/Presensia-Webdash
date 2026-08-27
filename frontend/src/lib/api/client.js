const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  'https://apipre.kitaundang.my.id'
).replace(/\/$/, '');

const GET_CACHE_TTL_MS = 45_000;
const getCache = new Map();

async function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const isCacheableGet = method === 'GET';
  const cacheKey = `${method}:${path}`;

  if (isCacheableGet) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise;
    }
  }

  const promise = fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Request API gagal.');
      }

      if (!isCacheableGet) {
        getCache.clear();
      }

      return payload.data;
    })
    .catch((error) => {
      if (isCacheableGet) {
        getCache.delete(cacheKey);
      }

      throw error;
    });

  if (isCacheableGet) {
    getCache.set(cacheKey, {
      expiresAt: Date.now() + GET_CACHE_TTL_MS,
      promise,
    });
  }

  return promise;
}

async function requestBlob(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Request file gagal.');
  }

  return response.blob();
}

function toQueryString(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getDashboardData(source = 'auto') {
  return request(`/api/admin/dashboard?source=${encodeURIComponent(source)}`);
}

export function getDashboardSourceSetting() {
  return request('/api/admin/settings/dashboard-source');
}

export function updateDashboardSourceSetting(dashboardDataSource) {
  return request('/api/admin/settings/dashboard-source', {
    method: 'PUT',
    body: JSON.stringify({ dashboardDataSource }),
  });
}

export function getBlinkDetectionSetting() {
  return request('/api/admin/settings/blink-detection');
}

export function updateBlinkDetectionSetting(requiresBlink) {
  return request('/api/admin/settings/blink-detection', {
    method: 'PUT',
    body: JSON.stringify({ requiresBlink }),
  });
}

export function getGlobalSettings() {
  return request('/api/admin/settings/global');
}

export function getHeaderData(date) {
  return request(`/api/admin/header${toQueryString({ date })}`);
}

export function searchHeader(query) {
  return request(`/api/admin/header/search${toQueryString({ q: query })}`);
}

export function markHeaderNotificationRead(id) {
  return request(`/api/admin/header/notifications/${encodeURIComponent(id)}/read`, {
    method: 'POST',
  });
}

export function getSidebarData() {
  return request('/api/admin/sidebar');
}

export function updateGlobalSettings(settings) {
  return request('/api/admin/settings/global', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export function getWorkShifts() {
  return request('/api/admin/settings/shifts');
}

export function createWorkShift(payload) {
  return request('/api/admin/settings/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWorkShift(id, payload) {
  return request(`/api/admin/settings/shifts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deactivateWorkShift(id) {
  return request(`/api/admin/settings/shifts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function getEmployees() {
  return request('/api/admin/employees');
}

export function createEmployee(payload) {
  return request('/api/admin/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(id, payload) {
  return request(`/api/admin/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(id) {
  return request(`/api/admin/employees/${id}`, {
    method: 'DELETE',
  });
}

export function getAttendanceRecords() {
  return request('/api/admin/attendance');
}

export function getAttendanceReport(filters = {}) {
  return request(`/api/admin/reports/attendance${toQueryString(filters)}`);
}

export function exportAttendanceReportCsv(filters = {}) {
  return requestBlob(`/api/admin/reports/attendance/export.csv${toQueryString(filters)}`);
}

export function getWorklogs(filters = {}) {
  return request(`/api/admin/worklogs${toQueryString(filters)}`);
}

export function getOfficeLocations() {
  return request('/api/admin/office-locations');
}

export function resolveOfficeMapLink(mapsUrl) {
  return request('/api/admin/office-locations/resolve-map-link', {
    method: 'POST',
    body: JSON.stringify({ maps_url: mapsUrl }),
  });
}

export function createOfficeLocation(payload) {
  return request('/api/admin/office-locations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateOfficeLocation(id, payload) {
  return request(`/api/admin/office-locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteOfficeLocation(id) {
  return request(`/api/admin/office-locations/${id}`, {
    method: 'DELETE',
  });
}

export function getQrLoginTokens() {
  return request('/api/admin/qr-login');
}

export function generateQrLoginToken(payload) {
  return request('/api/admin/qr-login/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function revokeQrLoginToken(tokenId) {
  return request('/api/admin/qr-login/revoke', {
    method: 'POST',
    body: JSON.stringify({ token_id: tokenId }),
  });
}

export function getDevices() {
  return request('/api/admin/devices');
}

export function resetEmployeeDevices(employeeId) {
  return request('/api/admin/devices/reset', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId }),
  });
}

export function revokeDevice(employeeId, deviceId) {
  return request('/api/admin/devices/revoke', {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, device_id: deviceId }),
  });
}

export function prefetchRouteData(path) {
  const prefetcher = routePrefetchers[path];
  if (!prefetcher) return Promise.resolve();

  return Promise.allSettled(prefetcher()).then(() => undefined);
}

function routePrefetchersForToday() {
  const today = new Date();
  const to = toDateInput(today);

  return {
    worklog: {
      from: toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)),
      to,
      employee_id: '',
      project: '',
    },
    report: {
      from: toDateInput(new Date(today.getFullYear(), today.getMonth(), 1)),
      to,
      department: '',
      status: '',
    },
  };
}

const routePrefetchers = {
  '/': () => [getDashboardData('supabase')],
  '/karyawan': () => [getEmployees()],
  '/presensi': () => [getAttendanceRecords()],
  '/lokasi-kantor': () => [getOfficeLocations()],
  '/qr-login': () => [getEmployees(), getQrLoginTokens()],
  '/devices': () => [getDevices()],
  '/worklog': () => {
    const { worklog } = routePrefetchersForToday();
    return [getWorklogs(worklog), getEmployees()];
  },
  '/laporan': () => {
    const { report } = routePrefetchersForToday();
    return [getAttendanceReport(report)];
  },
  '/pengaturan': () => [getGlobalSettings(), getWorkShifts()],
};

function toDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
