# CLAUDE.md — Frontend Presensia

Dashboard Web Admin berbasis React, Vite, dan Tailwind CSS.
Menyediakan modul pemantauan presensi wajah + geofence GPS, management karyawan, security QR login, device binding, dan rekap laporan.

---

## Tech Stack & Libraries
- **Framework:** React 18 / Vite 6 (JavaScript/JSX, bukan TypeScript)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS v4
- **Icons:** lucide-react
- **Database Access:** @supabase/supabase-js (anon client)
- **QR Code Rendering:** qrcode.react
- **Date utilities:** date-fns

---

## Core Development Commands
Jalankan dari direktori `Website/frontend/`:
- **Instal Dependencies:** `npm install`
- **Run Local Development:** `npm run dev` (berjalan di port 5173)
- **Build Production:** `npm run build`
- **Preview Production Build:** `npm run preview`

---

## Guidelines & Architecture

### 1. Struktur Folder
- `src/components/layout/`: Komponen pembungkus halaman (`MainLayout`, `Sidebar`, `Topbar`).
- `src/components/ui/`: Komponen atomik reusable (`Button`, `Badge`, `Modal`, `DataTable`).
- `src/components/features/`: Modul/card fitur seperti peta preview atau tracker detail.
- `src/pages/`: Halaman-halaman penuh yang terhubung ke router.
- `src/data/`: Berisi mock data representasi schema Supabase untuk demonstrasi prototipe.
- `src/lib/utils/`: Helper utilitas seperti format tanggal (`dateFormatter.js`) dan Tailwind merge (`cn.js`).

### 2. Styling & UX Design Rules
- **Bahasa:** Seluruh UI wajib menggunakan **Bahasa Indonesia**.
- **Warna:** Dominan warna biru tenang/soft blue (`#2563EB` atau `#0D6EFD`), background soft tint (`#F0F7FF`), clean white surfaces dengan border soft slate (`border-slate-100`).
- **Kepadatan Data:** Gunakan layout yang padat (compact padding `py-2 px-3` pada tabel) agar efisien digunakan admin/HR untuk meninjau data dalam jumlah besar.

### 3. Integrasi Supabase & API Backend
- Gunakan Supabase Client di `src/lib/supabase/client.js` untuk interaksi langsung (Auth login admin, fetch read-only data yang diamankan RLS).
- Operasi tulis/ubah tingkat admin (seperti membuat user karyawan baru, generate QR, reset device binding) **TIDAK BOLEH** langsung memanggil Supabase dengan service role key di frontend. Delegasikan ke Express.js backend:
  - Base URL: `import.meta.env.VITE_BACKEND_URL` (default: `http://localhost:5000`)
  - Sertakan token admin JWT di header: `Authorization: Bearer <access_token>`
