# AuraForm — Google Forms-Inspired Web Application

**AuraForm** is a modern, responsive full-stack web application designed for creating and managing surveys, evaluations, event registrations, workshops, seminars, and university/college activities.

Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase (PostgreSQL, Auth & Row Level Security)**. A configured Supabase project is required for forms and authentication.

---

## 🌟 Key Features

1. **Authentication & Role-Based Access Control (RBAC)**:
   - Roles: `admin` (global control), `organizer` (owns forms & shared events), and `user` (respondent).
   - Admin-only **Organizer Access** menu to manage organizers and review user requests.
   - Regular users can request organizer access; only admins can approve or reject requests.
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

### 1. Install prerequisites and dependencies

Install **Node.js 18 or newer** (npm is included). On Windows, double-click `setup.bat` to install the exact dependencies from `package-lock.json` and start the development server. To install manually on any platform, run:

```bash
npm ci
```

### 2. Configure Supabase

Copy `.env.example` to `.env` if it does not exist, then set `VITE_SUPABASE_URL` and either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`. Use the exact project URL and a one-line public key from Supabase; do not include quotes or whitespace within either value. For Vercel, add these values under **Project Settings > Environment Variables** for each deployment environment you use, then redeploy so Vite includes the updated values. Complete the [Supabase setup](#supabase-setup) below. AuraForm has no offline data layer; valid Supabase credentials are required to load forms.

### 3. Start Development Server

If you installed dependencies manually, launch the server with:

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
- **Organizers:** New accounts are regular `user` accounts. Users can request organizer access from the dashboard; only the admin can approve/reject requests or remove organizer access from the **Organizer Access** menu.
- **Responders:** Authenticated users can submit responses to published public forms. They cannot create, edit, or manage forms.
- Role checks are enforced by Supabase Row Level Security and a role-management database function, not only by the UI.

### Supabase setup
1. In Supabase, open **Authentication > Providers > Email** and enable email/password sign-in and sign-ups. Configure email confirmation as desired.
2. In Supabase **Authentication > URL Configuration**, add `http://localhost:5173` and your deployed app URL to the allowed redirect URLs for email confirmation.
3. Open Supabase **SQL Editor** and run `supabase/migrations/002_secure_admin_and_rls.sql`, followed by `supabase/migrations/003_google_auth_and_member_roles.sql`, `supabase/migrations/004_fix_verified_admin_promotion.sql`, `supabase/migrations/005_organizer_member_management.sql`, `supabase/migrations/006_admin_only_member_role_management.sql`, `supabase/migrations/007_fix_ambiguous_role_lookup.sql`, `supabase/migrations/008_edit_response_answers.sql`, and `supabase/migrations/009_organizer_access_requests.sql`.
   - Run migration 003 only once: it defaults existing non-admin accounts to regular users; the designated administrator can assign organizer roles afterward.
   - If migration 005 was already applied, run migration 006 to ensure only admins can view the member access panel and change roles.
   - If migrations 002–006 were already applied, run migration 007 to fix the ambiguous `user_id` database error when creating forms.
   - Run migration 008 to enable authorized form managers to edit submitted question answers from the response sheet.
   - Run migration 009 to enable organizer access requests and admin review. If the earlier migrations are already applied, run migration 009 only.
4. In the project root (the same directory as `package.json`), copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your Supabase project URL and anon/publishable key, then restart the Vite server. The `.env` file is git-ignored; never use a `service_role` key in the frontend.

---

## 📱 Android ARM64 Ubuntu / PRoot Notes

* **Port Access**: Bound to port `5173` on `0.0.0.0` so you can test it directly in Android Chrome or Firefox at `http://localhost:5173`.
* **Resource Optimization**: Direct Supabase client calls avoid running heavy background Python/Postgres daemons on your Android device, conserving RAM and battery.
* **Tested & Verified**: TypeScript compilation (`tsc`) and Vite bundling (`vite build`) complete cleanly with 0 errors.
