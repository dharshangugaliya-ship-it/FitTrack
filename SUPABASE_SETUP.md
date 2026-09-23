# FITTRACK — Supabase Setup & Architecture Guide (Phase 2)

This document provides instructions for provisioning and configuring Supabase Authentication and the `profiles` table for FITTRACK.

---

## 1. Create Supabase Project
1. Navigate to [Supabase Dashboard](https://supabase.com/dashboard) and log in.
2. Click **New project**, choose an organization, and assign a project name (e.g. `fittrack-sih-2026`).
3. Set a strong database password and select a region closest to your target users (e.g., `ap-south-1` Mumbai).
4. Wait for the project initialization to complete.

---

## 2. Obtain Credentials
1. In the Supabase project dashboard, navigate to **Project Settings** → **API**.
2. Copy the **Project URL** (e.g., `https://xyzcompany.supabase.co`).
3. Copy the **anon / public** API key.
*(Note: Never expose the `service_role` secret in frontend code).*

---

## 3. Configure Environment Variables
1. In the root of this project, create or update `.env` (or configure your Cloud Run / AI Studio environment variables):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
2. For local testing, verify variables match `.env.example`.

---

## 4. Execute the Database Migration
1. Go to the Supabase Dashboard → **SQL Editor**.
2. Click **New query**.
3. Paste the contents of `supabase/migrations/20260918000000_create_profiles.sql` into the editor.
4. Click **Run**.
5. Verify the following in **Database** → **Tables**:
   - `public.profiles` table exists with columns:
     - `id` (UUID, primary key, references `auth.users`)
     - `display_name` (TEXT)
     - `avatar_url` (TEXT)
     - `mode` (TEXT, check constraint `challenger` | `organizer`)
     - `created_at` (TIMESTAMPTZ)
     - `updated_at` (TIMESTAMPTZ)
   - Row Level Security (RLS) is **Enabled**.
   - Three security policies are active:
     - `Users can view own profile` (`auth.uid() = id`)
     - `Users can insert own profile` (`auth.uid() = id`)
     - `Users can update own profile` (`auth.uid() = id`)

---

## 5. Enable Authentication Settings
1. Go to **Authentication** → **Providers** → **Email**.
2. Ensure **Email provider** is enabled.
3. For local development / quick evaluation, you may choose to toggle **Confirm email** off (or keep on for production testing).
4. In **Authentication** → **URL Configuration**, set the **Site URL** to your deployment or local URL (e.g., `http://localhost:3000`).

---

## 6. Run & Test the Application
1. Start the development server:
```bash
npm run dev
```
2. Open the application in your browser.
3. Test the full authentication lifecycle:
   - **Sign Up**: Enter a Display Name, Email, and Password. Verify the account is created in `auth.users` and a profile record is created in `public.profiles`.
   - **Log In**: Authenticate using your email/password credentials. Verify your session and name appear in the header.
   - **Mode Switch**: Toggle from Challenger to Organizer. Confirm `mode` updates in `public.profiles` and the view switches to `/organizer`.
   - **Protected Routes**: Try accessing `/dashboard` or `/organizer` in an incognito window without logging in; confirm redirection to `/login`.
   - **Log Out**: Sign out and confirm session is cleared and protected routes are guarded.

---

## 7. Dual-Mode Demo Helper (Evaluation Feature)
If evaluating without live Supabase credentials configured, FITTRACK includes a built-in **Demo Persona Helper** in the authentication modal:
- Allows testing Challenger (*Aarav Sharma*) and Organizer (*Priya Sundaram*) workspaces instantly.
- Clearly flags **DEMO MODE** in the profile and navigation bar so evaluators know it is not pretending to be live Supabase authentication.
