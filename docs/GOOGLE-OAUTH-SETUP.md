# Google Sign-In Setup

Google OAuth with Supabase is **free** (both Supabase and Google offer free tiers for standard usage).

## 1. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project or select an existing one.
3. Go to **APIs & Services** → **Credentials**.
4. Click **Create Credentials** → **OAuth client ID**.
5. If prompted, configure the **OAuth consent screen** (External user type is fine for most apps).
6. Select **Web application** as the application type.
7. Add **Authorized JavaScript origins**:
   - `http://localhost:3000` (for local development)
   - Your production URL (e.g. `https://your-app.vercel.app`)
8. Add **Authorized redirect URIs**:
   - Get the callback URL from Supabase: [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Google**
   - It will look like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
9. Copy the **Client ID** and **Client Secret**.

## 2. Enable Google in Supabase

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project.
2. Go to **Authentication** → **Providers**.
3. Find **Google** and enable it.
4. Paste the **Client ID** and **Client Secret** from step 1.
5. Save.

## 3. Add redirect URL in Supabase

1. Go to **Authentication** → **URL Configuration**.
2. Add your app URLs to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback` (for production)

## Done

Users can now sign in or sign up with Google on the login page.
