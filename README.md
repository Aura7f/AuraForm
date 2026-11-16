# AuraForm — Google Forms-Inspired Web Application

**AuraForm** is a modern, responsive full-stack web application designed for creating and managing surveys, evaluations, event registrations, workshops, seminars, and university/college activities.

Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth & Row Level Security)**. A configured Supabase project is required for forms and authentication.

---

## 🌟 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Roles: `admin` (global control), `organizer` (owns forms & shared events), and `user` (respondent).
   - Dashboard **Member access** panel for admins and organizers to adjust roles.
   - Email/password and Google authentication powered by Supabase Auth.

2. **Form & Event Builder**:
   - Google Forms-inspired design: Card layout with teal top accent, title, and description.
   - 7 Question types:
     - **Short answer**
     - **Paragraph**
     - **Multiple choice** (single-selection with dynamic options)
     - **Checkboxes** (multi-selection with dynamic options)
     - **Dropdown** (select menu)
     - **Date** (calendar date picker)
     - **Linear scale** (custom range 1–5 or 1–10 with configurable min/max labels)
   - Re-ordering (Move Up / Down), Duplicate question, Delete question, and Required toggle.

3. **Form & Event Settings**:
   - Status switcher: `Draft`, `Published (Active)`, or `Closed`.
   - Public vs. Private access.
   - Response limit cap (e.g. max 150 submissions).
   - Submission deadline date/time.
   - Event Mode: Set event date, venue / meeting link, and participant capacity.

4. **Multi-Organizer Collaboration**:
   - Invite fellow organizers by email.
   - Assign `editor` or `viewer` permissions.
   - Row Level Security (RLS) policies enforce authorized modifications.

5. **Public Form Responder**:
   - Google Forms aesthetic: distraction-free, mobile-first responsive layout.
   - Client-side validation: required question checks, email format checks, and range bounds.
   - Draft answers survive the sign-in round-trip via `sessionStorage`.
   - Duplicate-submission protection and deadline checks.
   - Shareable links: access any published public form via `http://localhost:5173/?form=<form-id>`.

6. **Analytics & Responses Dashboard**:
   - **Summary Tab**:
     - Visual bar charts with percentages and response distributions for multiple choice, checkboxes, and dropdowns.
     - Average score computation and rating histogram for linear scales.
     - Scrollable response feed for open-ended text answers.
   - **Individual Tab**:
     - Stepper navigation (Response 1 of N) with timestamps and exact submitted answers.
   - **Attendance & Check-in Tab** (for Event forms):
     - Participant table with status badges (`registered`, `confirmed`, `attended`, `cancelled`).
     - One-click **"Check In"** action to mark attendance with real-time timestamps.
     - Search and filter by participant name, email, or status.
   - **Export to CSV**:
     - Generates and downloads a clean CSV file including submission IDs, timestamps, participant data, and all answers.

---

## 🏗️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + TypeScript |
| **Build & Dev Server** | Vite 5 (HMR, minimal memory overhead) |
| **Styling** | Tailwind CSS + Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL, Auth, Row Level Security) |
| **Data Layer** | Supabase client (`formService.ts`) |
| **Platform** | Linux ARM64 (Android PRoot Ubuntu compatibility verified) |

---

## 🚀 Getting Started

### 1. Configure Supabase

Complete the [Supabase setup](#supabase-setup) below first. AuraForm has no offline data layer: without
valid `VITE_SUPABASE_*` credentials it shows a configuration message instead of forms.

### 2. Start Development Server

AuraForm is already installed and built in this directory. To launch the server:

```bash
npm run dev
```

The application runs on:
- **Local Browser:** `http://localhost:5173`
- **Network / Wi-Fi:** `http://<your-device-ip>:5173`

To build for production:
```bash
npm run build
```

---

## 🗄️ Supabase Setup & Security Architecture

AuraForm is connected to Supabase with airtight PostgreSQL Row Level Security (RLS) policies and Role-Based Access Control (RBAC):

### Authentication and roles
- **Sign-in:** A dedicated `/signin` page with Supabase email/password sign-in and account creation. Form links are preserved through sign-in.
- **Single administrator:** Only the verified account `arujagadeesh801@gmail.com` receives the `admin` role.
- **Organizers:** New accounts are regular `user` accounts. The admin can assign or remove organizer access from the dashboard's **Member access** panel.
- **Responders:** Authenticated users can submit responses to published public forms. They cannot create, edit, or manage forms.
- Role checks are enforced by Supabase Row Level Security and a role-management database function, not only by the UI.

### Supabase setup
1. In Supabase, open **Authentication > Providers > Email** and enable email/password sign-in and sign-ups. Configure email confirmation as desired.
2. In Supabase **Authentication > URL Configuration**, add `http://localhost:5173` and your deployed app URL to the allowed redirect URLs for email confirmation.
3. Open Supabase **SQL Editor** and run `supabase/migrations/002_secure_admin_and_rls.sql`, followed by `supabase/migrations/003_google_auth_and_member_roles.sql`, `supabase/migrations/004_fix_verified_admin_promotion.sql`, and `supabase/migrations/005_organizer_member_management.sql`.
   - Run migration 003 only once: it defaults existing non-admin accounts to regular users; the designated administrator can assign organizer roles afterward.
   - If migrations 003 and 004 were already applied, do not run them again; run migration 005 to let organizers manage member roles without granting admin privileges.
4. In the project root (the same directory as `package.json`), copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project URL and anon/publishable key, then restart the Vite server. The `.env` file is git-ignored; never use a `service_role` key in the frontend.

---

## 📱 Android ARM64 Ubuntu / PRoot Notes

* **Port Access**: Bound to port `5173` on `0.0.0.0` so you can test it directly in Android Chrome or Firefox at `http://localhost:5173`.
* **Resource Optimization**: Direct Supabase client calls avoid running heavy background Python/Postgres daemons on your Android device, conserving RAM and battery.
* **Tested & Verified**: TypeScript compilation (`tsc`) and Vite bundling (`vite build`) complete cleanly with 0 errors.
