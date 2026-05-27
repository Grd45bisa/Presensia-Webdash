const crypto = require('crypto');
const employeeStore = require('./employeeMockStore');

let tokens = [
  {
    id: 'qr-demo-1',
    employee_id: 'emp-2',
    employee_name: 'Siti Rahmawati',
    employee_email: 'siti.rahmawati@presensia.co.id',
    token_hash: crypto.createHash('sha256').update('demo-presensia-token').digest('hex'),
    status: 'active',
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    created_by: 'mock-admin',
    used_at: null,
    used_device_id: null,
  },
];

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeToken(token) {
  const expiresAt = new Date(token.expires_at);
  const status = token.status === 'active' && expiresAt <= new Date() ? 'expired' : token.status;

  return {
    ...token,
    status,
  };
}

function listTokens() {
  return tokens
    .map(normalizeToken)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function findEmployee(employeeId) {
  return employeeStore.listEmployees().find((employee) => employee.id === employeeId);
}

function createToken({ employee_id: employeeId, expires_in_minutes: expiresInMinutes = 5, created_by: createdBy = 'mock-admin' }) {
  const employee = findEmployee(employeeId);

  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.' };
  }

  if (employee.role === 'admin') {
    return { error: 'Akun admin tidak boleh login melalui QR.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + Number(expiresInMinutes || 5) * 60 * 1000).toISOString();
  const tokenRecord = {
    id: `qr-${Date.now()}`,
    employee_id: employeeId,
    employee_name: employee.full_name,
    employee_email: employee.email,
    token_hash: hashToken(rawToken),
    status: 'active',
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    created_by: createdBy,
    used_at: null,
    used_device_id: null,
  };

  tokens = [tokenRecord, ...tokens];

  return {
    token: rawToken,
    record: tokenRecord,
  };
}

function revokeToken(tokenId) {
  let updated = null;

  tokens = tokens.map((token) => {
    if (token.id !== tokenId) return token;
    updated = {
      ...token,
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    };
    return updated;
  });

  return updated;
}

function consumeToken(rawToken, deviceId) {
  const tokenHash = hashToken(rawToken);
  let matched = null;

  tokens = tokens.map((token) => {
    const normalized = normalizeToken(token);
    if (normalized.token_hash !== tokenHash) return normalized;
    matched = normalized;

    if (normalized.status !== 'active') {
      return normalized;
    }

    matched = {
      ...normalized,
      status: 'used',
      used_at: new Date().toISOString(),
      used_device_id: deviceId,
    };
    return matched;
  });

  if (!matched) {
    return { error: 'QR Code tidak valid.' };
  }

  if (matched.status !== 'used') {
    return { error: 'QR Code sudah digunakan, dibatalkan, atau kedaluwarsa.' };
  }

  const employee = findEmployee(matched.employee_id);
  if (!employee) {
    return { error: 'Karyawan tidak ditemukan.' };
  }

  return { token: matched, employee };
}

module.exports = {
  listTokens,
  createToken,
  revokeToken,
  consumeToken,
};
