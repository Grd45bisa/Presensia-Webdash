# AGENT.md - Panduan Pengerjaan Website Presensia

Dokumen ini menjadi pegangan kerja untuk semua perubahan di folder `Website/`. Tujuannya agar pengembangan dashboard admin Presensia tetap bertahap, konsisten dengan dokumen desain, dan tidak keluar dari kebutuhan proyek.

## Cara Kerja

- Kerjakan website secara bertahap. Jangan membangun semua modul sekaligus dalam satu perubahan besar.
- Sebelum mengubah frontend atau backend, baca konteks utama:
  - `Website/STRUKTUR-DASHBOARD-ADMIN.md`
  - `Website/DESIGN.md`
  - file relevan di `Website/backend/src/`
  - file relevan di `Website/frontend/src/`
- Prioritaskan tampilan website dulu menggunakan mock data lokal. Integrasi Supabase/backend dilakukan setelah desain halaman cukup stabil.
- Jika backend masih berubah, buat frontend dengan boundary yang jelas: data mock berada di `frontend/src/data/`, logic akses API/Supabase dipisah di `frontend/src/lib/`.
- Hindari menyimpan service role key atau secret backend apa pun di frontend.
- Gunakan Bahasa Indonesia untuk seluruh teks UI.

## Prioritas Tahapan

### Tahap 1 - Fondasi Dashboard

- Login admin prototype.
- Layout utama dashboard: sidebar, topbar, area konten.
- Dashboard ringkasan dengan stat card, presensi terbaru, dan ringkasan hari ini.
- Struktur route halaman utama.

### Tahap 2 - Karyawan dan Lokasi Kantor

- Halaman daftar karyawan.
- Form tambah/edit karyawan berbasis mock data.
- Detail karyawan jika struktur halaman utama sudah stabil.
- Halaman lokasi kantor dan pengaturan radius geofence.

### Tahap 3 - QR Login dan Device

- Halaman generate QR login.
- Riwayat token QR dan status token.
- Halaman/tab device binding.
- Aksi revoke/reset dibuat simulasi dulu jika backend belum final.

### Tahap 4 - Presensi

- Tabel presensi lengkap.
- Filter tanggal, karyawan, departemen, tipe presensi, geofence, dan fake GPS.
- Modal/detail presensi dengan foto bukti, skor wajah, GPS, dan geofence.

### Tahap 5 - Worklog, Laporan, dan Pengaturan

- Worklog karyawan.
- Rekap laporan presensi/worklog.
- Pengaturan organisasi, radius default, masa berlaku QR, dan threshold wajah.

## Prinsip Desain UI

- Dashboard harus terasa profesional, bersih, padat, dan cocok untuk HR/admin.
- Jangan buat landing page. Aplikasi langsung ke Login Admin atau Dashboard.
- Gunakan warna dasar sesuai `DESIGN.md`:
  - background biru sangat muda atau slate muda
  - surface putih
  - primary biru `#2563EB` atau setara
  - status sukses hijau, warning amber, danger rose
- Jaga density. Hindari hero besar, ilustrasi kartun, dan layout marketing.
- Gunakan card hanya untuk item berulang, panel data, modal, atau tool yang memang perlu dibingkai.
- Gunakan ikon dari `lucide-react` untuk tombol atau navigasi bila tersedia.
- Tabel harus mudah discan: header jelas, badge status ringkas, aksi tidak memenuhi layar.
- UI harus responsif untuk desktop dan tablet. Mobile minimal tetap terbaca dan navigasi bisa dipakai.

## Stack dan Struktur

Frontend:

- React + Vite + JSX.
- Styling mengikuti Tailwind/CSS yang sudah ada.
- Routing memakai `react-router-dom`.
- Ikon memakai `lucide-react`.
- QR memakai `qrcode.react`.
- Mock data tetap di `Website/frontend/src/data/`.

Backend:

- Express.js CommonJS.
- Endpoint admin berada di `Website/backend/src/routes/`.
- Middleware admin ada di `Website/backend/src/middleware/verifyAdmin.js`.
- Supabase service role hanya di backend melalui `Website/backend/src/lib/supabaseAdmin.js`.

## Kontrak Data Sementara

Ikuti bentuk data dari mock yang sudah ada, tetapi tetap ingat rujukan database di dokumen:

- `profiles`
- `attendance_records`
- `admin_attendance_overview`
- `office_locations`
- `qr_login_tokens`
- `user_devices`
- `worklog_entries`
- `projects`
- `face_embeddings`

Catatan penting: dokumen desain dan backend saat ini belum sepenuhnya memakai nama field yang sama.

Contoh perbedaan yang perlu dijaga saat membuat UI:

- Desain menyebut `nama_lengkap`, backend memakai `full_name`.
- Desain menyebut `tipe_presensi`, backend memakai `attendance_mode`.
- Desain menyebut `nama_lokasi`, backend memakai `name`.
- Desain menyebut `radius`, backend memakai `radius_meters`.
- Desain menyebut `status_aktif`, backend memakai `is_active`.

Saat membuat komponen UI, pakai adapter/helper kecil jika perlu agar perubahan backend nanti tidak menyebar ke banyak komponen.

## Aturan Integrasi

- Operasi baca yang aman boleh disiapkan dari Supabase anon client setelah RLS siap.
- Operasi admin harus lewat backend:
  - membuat akun karyawan
  - update data sensitif karyawan
  - generate QR login
  - revoke QR token
  - reset device binding
  - CRUD lokasi kantor jika butuh audit/admin authorization
- Frontend tidak boleh mengakses Supabase Admin API.
- Foto bukti presensi harus dianggap data sensitif. Tampilkan hanya untuk admin, nanti gunakan signed URL/private storage.

## Kualitas Implementasi

- Perubahan harus kecil dan mudah direview.
- Utamakan komponen reusable untuk pola yang berulang: `Button`, `Badge`, `Modal`, `StatCard`, tabel, filter bar, empty state.
- Jangan duplikasi logic filter/format tanggal jika sudah ada util di `frontend/src/lib/utils/`.
- Jika menambah fitur visual, pastikan teks tidak saling tumpang tindih pada ukuran layar umum.
- Jalankan minimal `npm run build` dari `Website/frontend` setelah perubahan frontend yang signifikan.
- Untuk perubahan backend, cek syntax dan jalankan server bila perlu.

## Nada Produk

Presensia adalah sistem presensi wajah dan lokasi untuk kebutuhan skripsi/aplikasi organisasi. UI harus membantu admin merasa sistem ini:

- jelas untuk dipakai sehari-hari
- aman untuk data sensitif
- siap dikembangkan ke Supabase asli
- cukup rapi untuk dipresentasikan ke dosen pembimbing

