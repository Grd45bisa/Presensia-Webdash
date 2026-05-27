# Design Document: Presensia Admin Web Dashboard

This document details the software design, visual layout, data schema, interactions, and component architecture for the **Presensia Admin Dashboard**—an Indonesian employee attendance web system based on face recognition.

## 1. Project Overview & Objectives

**Presensia** is a professional SaaS-style web application designed for HR administrators to manage employees, monitor real-time face recognitions, configure geofences/office coordinates, generate secure QR Login tokens, audit worklogs, and download reports.

The user interface behaves as a cohesive extension of the mobile app:
- **Clean white surfaces** with subtle shadows.
- **Light blue background** (`#F0F7FF` or similar) to give an airy feel.
- **Soft blue primary accents** (`#0D6EFD` or `#2563EB`) as the primary brand color.
- **Compact but organized layout** designed for desktop and tablet screens, prioritizing efficiency and density over marketing/hero elements.
- **Strictly Indonesian language (Bahasa Indonesia)** throughout the UI to align with local organizational needs.

---

## 2. Design System & Visual Guidelines

| Element | Specification / Choice | Tailwind / CSS Suggestion |
| :--- | :--- | :--- |
| **Primary Color** | Medium/Soft Blue | `bg-blue-600` / `#2563EB` |
| **Secondary Accents**| Light Blue (Brand) | `bg-blue-50` / `#EFF6FF` |
| **Success Status** | Emerald Green | `text-emerald-700 bg-emerald-50 border-emerald-200` |
| **Warning Status** | Amber/Orange | `text-amber-700 bg-amber-50 border-amber-200` |
| **Danger Status** | Rose Red | `text-rose-700 bg-rose-50 border-rose-200` |
| **Muted/Slate** | Cool Gray / Slate | `text-slate-600 bg-slate-50 border-slate-200` |
| **Background** | Light Blue-Gray Tint | `bg-slate-50` or `bg-blue-50/30` |
| **Surfaces** | Clean White | `bg-white shadow-sm border border-slate-100` |
| **Border Radius** | Subtly Rounded | `rounded-lg` (8px) to `rounded-xl` (12px) |
| **Typography** | Inter or Sans-Serif | Professional, highly readable, clear weight hierarchy |
| **Density** | Compact Data Layout | Smaller paddings (`py-2 px-3` in tables), no large gaps |

### UX Rules:
- **No Landing Page:** Direct redirect to **Login Admin**. Once logged in, the first screen is the **Dashboard**.
- **No Cartoon Illustrations:** Keep the visual structure strictly professional and dashboard-centric.
- **Responsive Layout:** Desktop-first design. Collapsible navigation drawer on mobile and tablet screens.

---

## 3. Database Schema Blueprint (Supabase Reference)

To ensure the mock data matches the eventual Supabase database integration, the React components should structure state and data matching these entities:

### `profiles` (Karyawan)
Stores employee registration details, settings, and relationship links.
```typescript
interface Profile {
  id: string; // UUID
  nama_lengkap: string;
  email: string;
  phone?: string;
  departemen: string; // e.g. IT, HR, Sales, Operasional
  posisi: string; // e.g. Staff, Supervisor, Manager
  role: 'admin' | 'employee';
  tipe_presensi: 'office' | 'field' | 'remote'; // Kantor, Lapangan, Remote
  office_location_id: string | null; // FK to office_locations
  boleh_presensi_luar_kantor: boolean;
  status_wajah: 'registered' | 'not_registered';
  device_aktif_id: string | null; // FK to user_devices
  created_at: string;
}
```

### `attendance_records` (Presensi)
Captures check-in, check-out, and spatial/visual verification telemetry.
```typescript
interface AttendanceRecord {
  id: string; // UUID
  profile_id: string; // FK to profiles
  tanggal: string; // YYYY-MM-DD
  check_in: string | null; // HH:MM:SS or ISO Timestamp
  check_out: string | null; // HH:MM:SS or ISO Timestamp
  latitude_in: number | null;
  longitude_in: number | null;
  latitude_out: number | null;
  longitude_out: number | null;
  gps_accuracy_in: number | null; // meters
  gps_accuracy_out: number | null; // meters
  is_mock_location_in: boolean;
  is_mock_location_out: boolean;
  is_inside_geofence_in: boolean;
  is_inside_geofence_out: boolean;
  distance_from_office_in: number | null; // meters
  distance_from_office_out: number | null; // meters
  face_similarity_score_in: number | null;
  face_similarity_score_out: number | null;
  evidence_photo_in_url: string | null; // Storage path in bucket 'attendance-evidence'
  evidence_photo_out_url: string | null; // Storage path in bucket 'attendance-evidence'
  status: 'hadir' | 'terlambat' | 'absen' | 'luar_geofence' | 'fake_gps';
}
```

### `office_locations` (Lokasi Kantor)
Defines geofencing boundaries for office-based employees.
```typescript
interface OfficeLocation {
  id: string; // UUID
  nama_lokasi: string; // e.g., Head Office, Branch Surabaya
  alamat: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters (default: 100)
  status_aktif: boolean;
}
```

### `qr_login_tokens` (Token QR Login)
Handles secure app bindings via one-time tokens.
```typescript
interface QrLoginToken {
  id: string; // UUID
  profile_id: string; // FK to profiles
  token_hash: string;
  status: 'active' | 'used' | 'expired' | 'revoked';
  expired_at: string;
  used_at: string | null;
  device_id: string | null; // FK to user_devices
}
```

### `user_devices` (Device Binding)
Secures employee log ins to single physical units.
```typescript
interface UserDevice {
  id: string; // Device ID UUID/Unique string
  profile_id: string;
  device_name: string; // e.g., Samsung Galaxy S21
  platform: 'android' | 'ios';
  app_version: string;
  last_seen: string;
  status_aktif: boolean;
  bound_via: 'qr_login' | 'manual_admin';
}
```

### `worklog_entries` & `projects` (Worklog)
Tracks daily work reports submitted by staff.
```typescript
interface Project {
  id: string;
  nama_project: string;
}

interface WorklogEntry {
  id: string;
  profile_id: string;
  tanggal: string;
  project_id: string;
  task: string;
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  durasi_menit: number;
}
```

### `work_schedule_settings` & Global settings
```typescript
interface AppSettings {
  default_qr_expiration_minutes: number; // e.g., 5
  default_geofence_radius: number; // meters e.g., 100
  face_threshold: number; // similarity decimal e.g. 0.85
  organization_name: string;
}
```

---

## 4. Main Interface & Navigation Layout

The visual application is divided into a robust, layout-oriented structure using React.

### Layout Hierarchy:
```text
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ██████ PRESENSIA   [Page Title]    [Search]  [Date Filter]  [🔔] [👤] │
│ ─────────────────   ────────────────────────────────────────────────── │
│  ■ Dashboard                                                           │
│  ■ Karyawan                                                            │
│  ■ Presensi                                                            │
│  ■ Lokasi Kantor          MAIN WORKSPACE CONTENT AREA                  │
│  ■ QR Login                                                            │
│  ■ Worklog                                                             │
│  ■ Laporan                                                             │
│  ■ Pengaturan                                                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

- **Sidebar (Panel Kiri):** Darker text on bright background or premium slate, showcasing the clean **Presensia Logo** in dark blue, with responsive toggling. Employs crisp Lucide/Heroicons.
- **Topbar (Panel Atas):** Title reflecting the current active page, live search field, dynamic date-range selector, indicator icons (bell for warning notifications like outside-geofence, fake GPS alerts), and admin initials/avatar.
- **Main Workspace (Area Tengah):** Responsive desktop-first container. Standardized margin paddings (`p-6` or `p-8`) utilizing a soft light blue background.

---

## 5. Detailed Page Designs (11 Key Modules)

### Page 1: Login Admin
- **Layout:** Centered, minimalist card containing Presensia logo, subtext: "Sistem Presensi Deteksi Wajah & Lokasi".
- **Fields:** Email, Password, and a dynamic submit button.
- **Validation:** Validates role `admin`. Returns an elegant warning state if the user tries to login with an `employee` profile: *"Akun Anda bukan Admin. Akses ditolak."*

### Page 2: Dashboard (Ringkasan)
- **Top Metrics Row (Stat Cards):**
  1. *Total Karyawan* (Sum of active profiles)
  2. *Hadir Hari Ini* (Sum of today's attendance records)
  3. *Belum Presensi* (Total profiles minus today's check-ins)
  4. *Di Luar Geofence* (Count where `is_inside_geofence_in = false` or `is_inside_geofence_out = false`)
  5. *Indikasi Fake GPS* (Count where `is_mock_location_in = true` or `is_mock_location_out = true`)
- **Visual Trend:** Interactive chart showing daily attendance rates over the current month.
- **Presensi Terbaru Panel:** Live scrollable activity feed detailing who checked in and where (with visual status badges: inside geofence vs outside).
- **Ringkasan Presensi Hari Ini Table:** Clean datatable summarizing today's complete roster check-ins/outs with immediate face score metrics.

### Page 3: Karyawan (Manajemen User)
- **Primary View:** Complete list of profiles in a robust data table. Includes column headers for name, email, department, position, system role, attendance mode, office location, binding status, face status.
- **Interactive Actions:** Add Karyawan (opens side drawer/modal), Edit Karyawan details, and View Detail Karyawan.
- **Modal Fields:**
  - *Nama Lengkap*, *Email*, *Posisi*, *Departemen*, *Nomor Telepon*, *Role* (Dropdown: Admin / Karyawan)
  - *Tipe Presensi* (Kantor, Lapangan, Remote)
  - *Lokasi Kantor* (Linked to `office_locations`)
  - *Toggle Boleh Presensi Luar Kantor* (Enables/disables strict office matching)

### Page 4: Detail Karyawan
- **Profile Summary Header:** Display card showcasing name, email, role, face enrollment status (checkmark/badge), active bound device, and direct quick-action buttons.
- **Sub-Navigation Tabs:**
  - *Ringkasan:* General overview of their key configurations.
  - *Presensi:* Filterable chronological list of this user's attendance records.
  - *Worklog:* Complete historical list of daily work activity descriptions.
  - *Device:* Details on their currently bound device hardware, active logs, and a "Reset Device Binding" action button.
  - *QR Login:* Historical log of QR token generations and currently active QR codes.

### Page 5: Presensi (Log Presensi Harian)
- **Filters:** Fast toolbar containing filters for Tanggal (Date), Karyawan (Search), Departemen (Dropdown), Tipe User (Office/Field/Remote), Status Geofence (Inside/Outside/Disabled).
- **Table Columns:** Date/Time, Name, Type, Check-In, Check-Out, Location Coordinates, Geofence Badge, GPS Accuracy, Face Similarity Score, Verification Status Badge, Details Action.
- **Modal Detail Presensi:** Heavyweight inspection drawer displaying:
  - User details & exact timestamps.
  - Verification telemetry: exact lat/long, GPS accuracy circle in meters.
  - Geofence Audit: Geofence compliance, distance from office in meters.
  - Face Match Audit: Face similarity score plotted against the system threshold (e.g., `0.92 / 0.85` ✅).
  - Evidence Photo: The raw high-resolution facial photo upload from the employee's phone.
  - Map View: An interactive mock map indicating coordinates of both the office geofence boundary and the user's check-in pin.

### Page 6: Lokasi Kantor
- **Office Registry Table:** Displays name of the location, full address, coordinates (latitude, longitude), geofencing radius (in meters), active status, action triggers.
- **Location Creator Drawer:** Modal allowing inputs for office names, geo-coordinate inputs, address fields, and a slider to modify the geofencing boundary radius.
- **Map Pin UI:** Clean container showing where the office center is placed, allowing easy manual adjustment coordinates.

### Page 7: QR Login (Secure App Setup)
- **Purpose:** Restricts access by requiring HR to generate temporary QR codes for login to the mobile app.
- **Interface Layout:** Split layout. Left panel hosts the employee selection selector and a prominent "Generate QR" action. Center displays a temporary QR code preview with timer, token string copy trigger.
- **Roster Token Logs Table:** Track history of token statuses (Active, Used, Expired, Revoked), expiration timestamps, device matching bindings, and a manual "Revoke Token" security action.

### Page 8: Device Binding
- **Action Dashboard:** Lists physical hardware identifiers registered to specific users. Includes ID, Device Name (e.g., iPhone 13 Pro), OS Platform, App Version, Last Connection time, and Security Bound method (QR/Manual).
- **Core Security Action:** *Reset Binding*. Immediately clears the active binding, forcing the user to acquire a new QR Login token from the HR manager.

### Page 9: Worklog
- **Data Table:** Renders columns for Date, Employee, Project Name, Task Description, Start Time, End Time, and Total Calculated Duration.
- **Filter Suite:** Date pickers, Employee name selectors, and specific Project filters to analyze specific sprint or project investments.

### Page 10: Laporan (Recap & Export)
- **Analytical Controls:** Renders master filters across periods, departments, and individual employees.
- **Visual Graphs:**
  - *Attendance Summary:* High-level charts tracking presence rates (Ontime, Late, Absent, Outside Office).
  - *Worklog Summary:* Hour distributions spent per project.
- **Recap Grid:** Renders monthly overview grid sheets suitable for payroll auditing.
- **Actions:** Professional "Ekspor PDF" and "Ekspor CSV" download triggers.

### Page 11: Pengaturan (Settings)
- **Organization Panel:** Input fields to set Company Name, Address, and upload logo guidelines.
- **Security Rule Settings:**
  - Default QR code expiration threshold (minutes).
  - Default office radius limits (meters).
  - Facial recognition threshold values (0.00 to 1.00 score match).
- **Account Admin Section:** Update personal admin email, password credentials, and register helper HR/Admin team members.

---

## 6. Technical Stack & File Structure Guidance

**Frontend Architecture:** React + Vite + JSX (JavaScript).
**Backend Architecture:** Express.js (Node.js) for admin-only Supabase operations.
**Deployment Target:** Vercel (Free Tier) for both static frontend and serverless backend functions.

To facilitate clean development and easy future transitions to Supabase, we structure the project into two distinct directories.

### Suggested Folder Organization
```text
Website/
├── frontend/                   # React + Vite + JSX
│   ├── public/                 # Static assets (logo, icons, etc.)
│   └── src/
│       ├── components/         # Reusable presentation nodes
│       │   ├── ui/             # Atomic elements (Badge, Button, Input, Modal, Table)
│       │   ├── layout/         # Shell containers (Sidebar, Topbar, MainLayout)
│       │   └── features/       # Feature modules (DashboardCard, MapPreview, QrGenerator)
│       ├── data/               # Roster of local mock data representing schemas
│       │   ├── mockProfiles.js
│       │   ├── mockAttendance.js
│       │   ├── mockOffices.js
│       │   ├── mockQrTokens.js
│       │   └── mockWorklogs.js
│       ├── utils/              # Calculation utilities (GPS math, date formatters)
│       ├── App.jsx             # Renders the active page layout based on state
│       ├── index.css           # Tailwind configurations
│       └── main.jsx
│
└── backend/                    # Express.js API Server
    ├── src/
    │   ├── routes/             # API routes (e.g., /api/admin/employees, /api/admin/qr-login)
    │   ├── middleware/         # Security (e.g., verifyAdminToken)
    │   └── lib/                # Supabase service role client
    ├── index.js                # Express entry point
    └── vercel.json             # Vercel serverless deployment config
```

### Transition to Supabase Plan:
1. Replace local imports in `data/` with asynchronous database calls using `@supabase/supabase-js` anon key on the frontend for read operations and RLS-protected writes.
2. Route high-privilege actions (like creating new users via Supabase Admin API or generating QR tokens) through the **Express.js backend** using the `service_role` key.
3. Connect Supabase Auth in the **Login Admin** page and verify the logged-in user profile inside the `profiles` table to check if their role is strictly `admin`.
4. Deploy the backend API as a Serverless Function on Vercel using the `vercel.json` adapter.
5. Use Supabase Realtime to stream newly incoming **attendance_records** directly into the Dashboard.
6. Replace raw media placeholders with dynamic signed URLs pointing to private Supabase Storage buckets under `attendance-evidence`.

---

## 7. Interactive & Behavioral Requirements

For the system prototype to feel highly functional and satisfying during demonstrations:
- **Filtering Logic:** Filters in **Presensi**, **Karyawan**, and **Worklog** should actively filter mock arrays to refresh the UI immediately.
- **Loading State Simulators:** Modals and actions (like "Generate QR" or "Simpan Karyawan") should display momentary loading spinners (0.5s) to simulate database write delays.
- **Status Badge Design Rules:**
  - *Inside Geofence:* Filled green badge.
  - *Outside Geofence:* Warning orange badge.
  - *Fake GPS:* Deep red alert badge with a hazard icon.
- **Forms Validation:** All fields inside Karyawan creation, Office location coordinates, and Settings must validate that data types are entered correctly (e.g. valid emails, correct coordinate numbers, positive numbers for radius).
