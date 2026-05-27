# Presensia Admin Dashboard

Website admin untuk Presensia, sistem presensi karyawan berbasis face recognition, geofence, QR login, device binding, worklog, dan laporan.

Project ini dibagi menjadi dua aplikasi:

```text
Website/
  frontend/   React + Vite + Tailwind CSS
  backend/    Express.js API server untuk operasi admin Supabase
```

## Fitur Utama

- Dashboard ringkasan presensi.
- Manajemen karyawan.
- Riwayat presensi harian.
- Lokasi kantor dan geofence.
- Secure QR Login untuk mobile app.
- Manajemen perangkat karyawan.
- Aktivitas worklog.
- Laporan dan ekspor.
- Pengaturan global.
- Fallback data sementara jika Supabase belum dikonfigurasi.

## Tech Stack

Frontend:

- React
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React
- Supabase JS Client

Backend:

- Node.js
- Express.js
- Supabase Service Role Client

Database:

- Supabase PostgreSQL
- SQL migration tersedia di folder `../SQL`

## Prasyarat

- Node.js 20 atau lebih baru.
- npm.
- Project Supabase.
- SQL schema Presensia sudah dijalankan di Supabase.

Urutan SQL yang disarankan:

```text
../SQL/20260524_00_full_presensia_schema.sql
../SQL/20260527_00_website_mobile_sync.sql
```

Setelah SQL dijalankan, pastikan minimal satu akun menjadi admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'email-admin@domain.com';
```

## Environment Variables

### Backend

Buat file `Website/backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

DASHBOARD_DATA_SOURCE=supabase
```

Catatan penting:

- `SUPABASE_SERVICE_ROLE_KEY` hanya boleh disimpan di backend.
- Jangan taruh service role key di frontend.
- Jika Supabase env belum diisi, backend tetap berjalan dengan data mock.

### Frontend

Buat file `Website/frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Instalasi

Install dependency backend:

```bash
cd Website/backend
npm install
```

Install dependency frontend:

```bash
cd Website/frontend
npm install
```

## Menjalankan Project

Jalankan backend:

```bash
cd Website/backend
npm run dev
```

Backend default berjalan di:

```text
http://localhost:5000
```

Jalankan frontend:

```bash
cd Website/frontend
npm run dev
```

Frontend default berjalan di:

```text
http://localhost:5173
```

## Build Production

Frontend:

```bash
cd Website/frontend
npm run build
```

Backend:

```bash
cd Website/backend
npm start
```

## Endpoint Backend

Beberapa endpoint utama:

```text
GET    /api/health

GET    /api/admin/dashboard
GET    /api/admin/header
GET    /api/admin/sidebar

GET    /api/admin/employees
POST   /api/admin/employees
PUT    /api/admin/employees/:id
DELETE /api/admin/employees/:id

GET    /api/admin/attendance

GET    /api/admin/office-locations
POST   /api/admin/office-locations
PUT    /api/admin/office-locations/:id
DELETE /api/admin/office-locations/:id
POST   /api/admin/office-locations/resolve-map-link

GET    /api/admin/qr-login
POST   /api/admin/qr-login/generate
POST   /api/admin/qr-login/revoke

GET    /api/admin/devices
POST   /api/admin/devices/reset
POST   /api/admin/devices/revoke

GET    /api/admin/worklogs

GET    /api/admin/reports/attendance
GET    /api/admin/reports/attendance/export.csv

GET    /api/admin/settings/global
PUT    /api/admin/settings/global

POST   /api/auth/qr-login
POST   /api/mobile/attendance/validate-geofence
POST   /api/mobile/devices/heartbeat
POST   /api/mobile/devices/logout
```

## Integrasi Dengan Mobile App

Website dashboard dan mobile app Presensia memakai kontrak database yang sama:

- `profiles`
- `office_locations`
- `attendance_records`
- `face_embeddings`
- `qr_login_tokens`
- `user_devices`
- `worklog_entries`
- `projects`
- `work_schedule_settings`
- `app_settings`

QR login mobile mengarah ke backend:

```text
POST /api/auth/qr-login
```

Untuk emulator Android, base URL default mobile app adalah:

```text
http://10.0.2.2:5000
```

## Catatan Status Data

Backend mendukung dua mode:

- `mock`: data sementara untuk development.
- `supabase`: data asli dari database Supabase.

Mode ini bisa diatur dari menu `Pengaturan Global` di dashboard.

Jika Supabase belum dikonfigurasi atau query gagal, beberapa endpoint akan fallback ke mock agar UI tetap bisa diuji.

## Struktur Folder

```text
Website/
  frontend/
    src/
      components/
        layout/
        ui/
      lib/
        api/
        supabase/
        utils/
      pages/
    package.json

  backend/
    src/
      lib/
      middleware/
      routes/
      index.js
    package.json

  AGENT.md
  DESIGN.md
  STRUKTUR-DASHBOARD-ADMIN.md
  README.md
```

## Dokumentasi Internal

- `AGENT.md` berisi arahan kerja agent/developer.
- `DESIGN.md` berisi arahan desain UI.
- `STRUKTUR-DASHBOARD-ADMIN.md` berisi blueprint fitur dashboard.

## Keamanan

- Jangan commit file `.env`.
- Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di frontend.
- Foto bukti presensi dan embedding wajah adalah data sensitif.
- Embedding mentah tidak ditampilkan di dashboard.
- Operasi admin seperti create user, QR login, dan reset device harus lewat backend.

## Catatan Development

Saat ini project masih dalam tahap pengembangan bertahap. Beberapa fitur sudah tersambung ke backend dan siap membaca Supabase, tetapi tetap menyediakan fallback mock untuk memudahkan demo dan pengujian awal.
