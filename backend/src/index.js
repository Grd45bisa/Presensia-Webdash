const express = require('express');
const cors = require('cors');
require('dotenv').config();

const employeesRouter = require('./routes/employees');
const qrLoginRouter = require('./routes/qrLogin');
const devicesRouter = require('./routes/devices');
const officeLocationsRouter = require('./routes/officeLocations');
const authRouter = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');
const headerRouter = require('./routes/header');
const sidebarRouter = require('./routes/sidebar');
const attendanceRouter = require('./routes/attendance');
const mobileAttendanceRouter = require('./routes/mobileAttendance');
const mobileDevicesRouter = require('./routes/mobileDevices');
const worklogsRouter = require('./routes/worklogs');
const reportsRouter = require('./routes/reports');

const app = express();

// ─── Middleware Global ────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin tidak diizinkan oleh CORS.'));
  },
  credentials: true,
}));
app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Presensia backend aktif.' });
});

// ─── Public Auth Routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/mobile/attendance', mobileAttendanceRouter);
app.use('/api/mobile/devices', mobileDevicesRouter);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
app.use('/api/admin/employees', employeesRouter);
app.use('/api/admin/qr-login', qrLoginRouter);
app.use('/api/admin/devices', devicesRouter);
app.use('/api/admin/office-locations', officeLocationsRouter);
app.use('/api/admin/dashboard', dashboardRouter);
app.use('/api/admin/settings', settingsRouter);
app.use('/api/admin/header', headerRouter);
app.use('/api/admin/sidebar', sidebarRouter);
app.use('/api/admin/attendance', attendanceRouter);
app.use('/api/admin/worklogs', worklogsRouter);
app.use('/api/admin/reports', reportsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server.' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Presensia backend berjalan di http://localhost:${PORT}`);
});

module.exports = app;
