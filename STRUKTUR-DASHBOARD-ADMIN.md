# Struktur Website Dashboard Admin Presensia

Dokumen ini menjadi blueprint awal untuk membangun website dashboard admin Presensia. Dashboard digunakan oleh admin/HR untuk mengelola user, mengatur aturan presensi, membuat QR login, serta memantau presensi wajah, lokasi, dan bukti presensi dari mobile app.

## Tujuan Dashboard

Dashboard admin dibuat untuk:

- Mendaftarkan dan mengelola akun karyawan.
- Mengatur tipe presensi user: kantor, lapangan, atau remote.
- Membuat QR Code login untuk mobile app.
- Mengatur lokasi kantor dan radius geofence.
- Memantau data presensi harian/bulanan.
- Melihat detail presensi: waktu, lokasi, status geofence, skor wajah, dan foto bukti.
- Meninjau worklog dan laporan performa karyawan.

## Role Pengguna

### Admin / HR

Admin memiliki akses untuk:

- Melihat semua data karyawan.
- Membuat dan mengubah data karyawan.
- Mengatur role dan tipe presensi.
- Membuat QR Code login.
- Mengatur lokasi kantor.
- Melihat seluruh data presensi dan worklog.
- Melihat bukti foto presensi.
- Melihat ringkasan laporan.

### Employee

Employee tidak menjadi target utama dashboard website. Akses employee tetap difokuskan melalui mobile app.

Jika nanti diperlukan, employee web hanya bersifat read-only untuk melihat ringkasan data pribadi.

## Acuan SQL

Website dashboard harus mengikuti struktur SQL di folder:

```text
../SQL/
```

File acuan utama:

```text
../SQL/20260524_00_full_presensia_schema.sql
../SQL/MOBILE_APPS_SQL_AUDIT.md
```

Tabel/view utama untuk dashboard:

- `profiles`
- `attendance_records`
- `admin_attendance_overview`
- `office_locations`
- `qr_login_tokens`
- `user_devices`
- `worklog_entries`
- `projects`
- `work_schedule_settings`
- `reminder_events`
- `face_embeddings`

Storage:

- `attendance-evidence`

## Navigasi Utama

Struktur menu yang disarankan:

```text
Dashboard
Karyawan
Presensi
Lokasi Kantor
QR Login
Worklog
Laporan
Pengaturan
```

## Struktur Halaman

### 1. Login Admin

Fungsi:

- Admin login menggunakan Supabase Auth.
- Setelah login, sistem mengecek `profiles.role`.
- Hanya user dengan role `admin` yang boleh masuk dashboard.

Komponen:

- Input email.
- Input password.
- Tombol masuk.
- Error state jika akun bukan admin.
- Redirect ke dashboard jika session masih aktif.

Data:

- `auth.users`
- `profiles.role`

### 2. Dashboard Ringkasan

Halaman pertama setelah login.

Konten utama:

- Total karyawan aktif.
- Jumlah hadir hari ini.
- Jumlah belum presensi hari ini.
- Jumlah presensi di luar geofence.
- Jumlah indikasi fake/mock location.
- Jumlah user kantor, lapangan, dan remote.
- Presensi terbaru.
- Karyawan yang belum check-out.

Komponen:

- Stat cards.
- Tabel presensi terbaru.
- Filter tanggal.
- Grafik ringkas kehadiran.

Data:

- `profiles`
- `attendance_records`
- `admin_attendance_overview`

### 3. Manajemen Karyawan

Halaman untuk mengelola data user/karyawan.

Fitur:

- Melihat daftar karyawan.
- Menambah karyawan baru.
- Mengubah data karyawan.
- Mengatur role: `admin` atau `employee`.
- Mengatur tipe presensi: `office`, `field`, atau `remote`.
- Mengatur apakah user boleh presensi di luar kantor.
- Menghubungkan user ke lokasi kantor tertentu.
- Melihat status device binding.
- Melihat status enrollment wajah.

Kolom tabel:

- Nama.
- Email.
- Departemen.
- Posisi.
- Role.
- Tipe presensi.
- Lokasi kantor.
- Device aktif.
- Status wajah.
- Aksi.

Form tambah/edit:

- Nama lengkap.
- Email.
- Departemen.
- Posisi.
- Nomor telepon.
- Role.
- Tipe presensi.
- Lokasi kantor.
- Toggle boleh presensi luar kantor.

Data:

- `profiles`
- `office_locations`
- `user_devices`
- `face_embeddings`

Catatan:

- Pembuatan akun baru harus memakai Supabase Admin API melalui endpoint Express.js backend.
- Jangan memakai service role key di frontend React.

### 4. Detail Karyawan

Halaman detail untuk satu karyawan.

Konten:

- Profil karyawan.
- Status tipe presensi.
- Device yang terhubung.
- Status enrollment wajah.
- Riwayat presensi.
- Riwayat worklog.
- QR login aktif/terakhir.

Tab yang disarankan:

- Ringkasan.
- Presensi.
- Worklog.
- Device.
- QR Login.

Data:

- `profiles`
- `attendance_records`
- `worklog_entries`
- `projects`
- `user_devices`
- `qr_login_tokens`
- `face_embeddings`

### 5. Presensi

Halaman untuk memantau seluruh data presensi.

Fitur:

- Filter tanggal.
- Filter karyawan.
- Filter departemen.
- Filter tipe user.
- Filter status geofence.
- Filter presensi kantor/lapangan/remote.
- Lihat detail presensi.
- Export data jika diperlukan.

Kolom tabel:

- Tanggal.
- Nama karyawan.
- Tipe presensi.
- Check-in.
- Check-out.
- Status.
- Lokasi.
- Status geofence.
- Akurasi GPS.
- Skor wajah.
- Foto bukti.
- Aksi detail.

Data:

- `admin_attendance_overview`
- `attendance_records`
- `attendance-evidence`

### 6. Detail Presensi

Halaman/modal untuk melihat detail satu presensi.

Konten:

- Nama karyawan.
- Tanggal presensi.
- Jam check-in.
- Jam check-out.
- Source presensi.
- Status presensi.
- Latitude dan longitude.
- Akurasi GPS.
- Status mock location.
- Status geofence.
- Jarak dari kantor.
- Skor similarity wajah.
- Threshold wajah.
- Foto bukti presensi.
- Lokasi kantor terkait.

Komponen:

- Detail text.
- Preview foto bukti.
- Map preview.
- Badge status geofence.
- Badge indikasi mock location.

Data:

- `admin_attendance_overview`
- `attendance-evidence`
- `office_locations`

Catatan privasi:

- Foto bukti presensi hanya boleh dilihat admin.
- Gunakan signed URL atau akses storage private.

### 7. Lokasi Kantor

Halaman untuk mengatur lokasi kantor dan geofence.

Fitur:

- Menambah lokasi kantor.
- Mengubah lokasi kantor.
- Mengaktifkan/nonaktifkan lokasi kantor.
- Mengatur radius geofence.
- Melihat daftar user yang memakai lokasi tersebut.

Kolom:

- Nama lokasi.
- Alamat.
- Latitude.
- Longitude.
- Radius.
- Status aktif.
- Aksi.

Form:

- Nama lokasi.
- Alamat.
- Latitude.
- Longitude.
- Radius meter.
- Status aktif.

Data:

- `office_locations`
- `profiles.office_location_id`

### 8. QR Login

Halaman untuk membuat dan mengelola QR Code login.

Fitur:

- Pilih karyawan.
- Generate token QR login.
- Tampilkan QR Code.
- Set masa berlaku token.
- Revoke token.
- Lihat status token: active, used, revoked, expired.
- Lihat device yang menggunakan token.

Data:

- `qr_login_tokens`
- `profiles`
- `user_devices`

Flow:

```text
Admin pilih karyawan
  -> klik Generate QR
  -> backend membuat token mentah + token_hash
  -> token_hash disimpan ke database
  -> token mentah ditampilkan sebagai QR Code
  -> user scan QR dari mobile app
  -> mobile mengirim token ke backend
  -> backend validasi token
  -> token menjadi used
  -> device user tercatat
```

Catatan keamanan:

- Token mentah hanya ditampilkan sekali saat QR dibuat.
- Database hanya menyimpan `token_hash`.
- Token harus memiliki `expires_at`.
- Token yang sudah `used` tidak boleh dipakai ulang.

### 9. Device Binding

Halaman ini dapat berupa tab di detail karyawan.

Fitur:

- Melihat device aktif user.
- Melihat riwayat device.
- Menonaktifkan device lama.
- Reset binding jika user ganti HP.

Data:

- `user_devices`
- `profiles.active_device_id`
- `profiles.device_bound_at`

Kolom:

- Device ID.
- Nama device.
- Platform.
- App version.
- Status aktif.
- Last seen.
- Bound via.
- Aksi.

### 10. Worklog

Halaman untuk meninjau pekerjaan harian karyawan.

Fitur:

- Filter tanggal.
- Filter karyawan.
- Filter project.
- Melihat durasi kerja.
- Melihat task harian.
- Export jika diperlukan.

Kolom:

- Tanggal.
- Nama karyawan.
- Project.
- Task.
- Start time.
- End time.
- Durasi.

Data:

- `worklog_entries`
- `projects`
- `profiles`

### 11. Laporan

Halaman laporan rekap.

Jenis laporan:

- Rekap presensi harian.
- Rekap presensi bulanan.
- Rekap keterlambatan atau absen.
- Rekap worklog per karyawan.
- Rekap worklog per project.
- Rekap presensi luar geofence.
- Rekap indikasi mock location.

Komponen:

- Filter periode.
- Filter departemen.
- Filter karyawan.
- Grafik.
- Tabel.
- Export PDF/CSV.

Data:

- `attendance_records`
- `admin_attendance_overview`
- `worklog_entries`
- `profiles`

### 12. Pengaturan

Halaman pengaturan global dashboard.

Fitur awal:

- Informasi organisasi.
- Pengaturan default radius kantor.
- Pengaturan masa berlaku QR login.
- Pengaturan threshold tampilan skor wajah.
- Pengaturan admin.

Catatan:

- Jika pengaturan global makin banyak, buat tabel baru seperti `app_settings`.
- Untuk tahap awal, pengaturan dapat ditangani lewat konstanta backend/dashboard terlebih dahulu.

## Komponen UI yang Dibutuhkan

Komponen dasar:

- Sidebar navigation.
- Topbar.
- Stat card.
- Data table.
- Filter bar.
- Search input.
- Date range picker.
- Select dropdown.
- Badge status.
- Modal detail.
- Confirmation dialog.
- QR Code preview.
- Map preview.
- Image preview.
- Empty state.
- Loading skeleton.

Badge status:

- Role admin/employee.
- Tipe user office/field/remote.
- Geofence inside/outside/not required.
- Mock location true/false.
- QR token active/used/revoked/expired.
- Device active/inactive.

## Rekomendasi Stack Website

Pilihan stack yang dipakai:

**Frontend:**
- React + Vite + JSX (bukan TypeScript, gunakan JavaScript biasa).
- React Router v6 untuk navigasi halaman (SPA routing).
- Supabase JS Client (`@supabase/supabase-js`) untuk auth dan akses data langsung dari frontend.
- Tailwind CSS untuk styling.
- TanStack Table untuk tabel kompleks.
- Library QR Code (misalnya `qrcode.react`) untuk generate tampilan QR.
- Map provider untuk preview lokasi (misalnya Leaflet atau Google Maps Embed).

**Backend:**
- Express.js (Node.js) sebagai API server terpisah.
- Digunakan khusus untuk operasi admin yang membutuhkan Supabase service role key.
- Contoh operasi backend: membuat akun karyawan baru, generate token QR, operasi admin-only lainnya.
- Dideploy sebagai Vercel Serverless Function atau server Node.js terpisah.

**Deployment:**
- Frontend (React Vite): deploy ke Vercel (free tier) sebagai static site.
- Backend (Express.js): deploy ke Vercel menggunakan adapter `vercel` untuk serverless, atau gunakan layanan gratis lain seperti Railway/Render jika butuh persistent server.

Catatan penting:

- Service role key **hanya boleh dipakai di backend (Express.js)**, tidak boleh ada di kode frontend.
- Frontend hanya memakai Supabase anon key untuk operasi yang dilindungi RLS.
- Admin operation seperti membuat user baru, reset device, generate QR harus lewat endpoint Express.js.
- Simpan environment variable di Vercel dashboard, bukan di file `.env` yang di-commit ke repo.

## Struktur Folder Website yang Disarankan

Proyek dibagi menjadi dua folder terpisah di dalam `Website/`:

```text
Website/
  frontend/                        <- React + Vite + JSX
    public/
    src/
      assets/
      components/
        layout/
          Sidebar.jsx
          Topbar.jsx
          MainLayout.jsx
        ui/
          Badge.jsx
          Button.jsx
          Modal.jsx
          StatCard.jsx
          DataTable.jsx
          FilterBar.jsx
          FormField.jsx
          EmptyState.jsx
        dashboard/
        attendance/
        employees/
        qr/
        map/
      data/                        <- Mock data sementara (nanti diganti Supabase)
        mockProfiles.js
        mockAttendance.js
        mockOffices.js
        mockQrTokens.js
        mockWorklogs.js
      lib/
        supabase/
          client.js                <- Supabase anon key client
        utils/
          dateFormatter.js
          gpsUtils.js
      pages/
        LoginPage.jsx
        DashboardPage.jsx
        KaryawanPage.jsx
        KaryawanDetailPage.jsx
        PresensiPage.jsx
        LokasiKantorPage.jsx
        QrLoginPage.jsx
        WorklogPage.jsx
        LaporanPage.jsx
        PengaturanPage.jsx
      App.jsx
      main.jsx
    index.html
    vite.config.js
    tailwind.config.js
    package.json

  backend/                         <- Express.js API Server
    src/
      routes/
        employees.js               <- POST /api/admin/employees
        qrLogin.js                 <- POST /api/admin/qr-login/generate
        devices.js                 <- POST /api/admin/devices/reset
      middleware/
        verifyAdmin.js             <- Middleware validasi token admin
      lib/
        supabaseAdmin.js           <- Supabase client dengan service role key
    index.js                       <- Entry point Express
    vercel.json                    <- Konfigurasi deploy ke Vercel serverless
    package.json
```

## Prioritas Implementasi

### Tahap 1 - Fondasi

- Setup project website.
- Setup Supabase client.
- Login admin.
- Guard role admin.
- Layout dashboard.

### Tahap 2 - Karyawan dan Lokasi

- Daftar karyawan.
- Detail karyawan.
- Edit tipe presensi user.
- CRUD lokasi kantor.

### Tahap 3 - QR Login dan Device

- Generate QR login.
- Revoke token.
- Lihat status token.
- Lihat device binding.

### Tahap 4 - Presensi

- Tabel presensi.
- Detail presensi.
- Preview foto bukti.
- Preview lokasi.
- Filter geofence/mock location.

### Tahap 5 - Laporan

- Ringkasan presensi.
- Rekap worklog.
- Export CSV/PDF.

## Catatan Integrasi dengan Mobile App

Website dashboard dan mobile app harus berbagi kontrak data yang sama.

Mobile app bertugas:

- Melakukan presensi wajah.
- Mengirim waktu presensi.
- Mengirim lokasi GPS.
- Mengirim status geofence.
- Mengirim skor wajah.
- Mengupload foto bukti.
- Mengirim device ID.
- Scan QR login.

Website dashboard bertugas:

- Mengelola user.
- Mengatur tipe presensi.
- Mengatur lokasi kantor.
- Membuat QR login.
- Memantau presensi.
- Melihat foto bukti, lokasi, dan skor wajah.
- Membuat laporan admin.

## Catatan Etika dan Privasi

Data wajah, foto bukti, lokasi, dan device termasuk data sensitif.

Prinsip yang harus dijaga:

- Tampilkan informasi yang transparan kepada user.
- Batasi akses foto bukti hanya untuk admin.
- Jangan tampilkan embedding mentah di dashboard.
- Jangan menyimpan data lokasi lebih banyak dari yang dibutuhkan.
- Gunakan RLS di Supabase dan operasi admin API melalui backend Express.js.
- Catat siapa admin yang membuat QR login atau mengubah data penting jika audit log ditambahkan nanti.

## Fitur Lanjutan Opsional

Fitur yang bisa ditambahkan setelah versi utama stabil:

- Audit log aktivitas admin.
- Approval koreksi presensi.
- Export laporan resmi per bulan.
- Multi-cabang kantor.
- Role tambahan seperti HR, manager, dan supervisor.
- Notifikasi dashboard untuk presensi mencurigakan.
- Deteksi pola presensi luar geofence.
- Peta heatmap lokasi presensi lapangan.
