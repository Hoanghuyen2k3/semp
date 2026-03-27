# Vercel Deployment & GitHub Setup

This guide covers: **GitHub repo**, **Vercel deployment**, **auto-deploy on push**, and **dev vs prod config** with minimal effort.

---

## 1. GitHub Repository

### Repo name suggestions

| Name | Notes |
|------|-------|
| `semp` | Short, matches project (Smart Eco-Monitoring Platform) |
| `semp-dashboard` | Emphasizes the dashboard |
| `garden-monitoring` | Matches existing README branding |
| `smart-eco-monitoring` | Descriptive |

**Recommended:** `semp` or `garden-monitoring`

### Create and push

```bash
# If not already a git repo
cd "c:\Users\Thi Huyen Hoang\Documents\Humber\Winter 2026\SEMP"
git init  # skip if already initialized

# Create repo on GitHub: github.com/new
# Name: semp (or your choice)
# Public, no README (you have one)

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/semp.git
git branch -M main
git add .
git commit -m "Initial commit: SEMP dashboard + Supabase + TTN"
git push -u origin main
```

---

## 2. Vercel Deployment

### Connect to GitHub

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. **Import** your GitHub repo (e.g. `semp`).
3. Configure:
   - **Root Directory:** `dashboard` ← important
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

### Environment variables (production)

In **Project Settings → Environment Variables**, add:

| Variable | Value | Where |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview |
| `HUGGINGFACE_TOKEN` | Your HF token (for Plant Health) | Production, Preview |

Then click **Deploy**.

---

## 3. Dev vs Prod – Minimal Effort

You use the **same env var names** everywhere. Only the values differ:

| Environment | Config file / source | Used when |
|-------------|----------------------|-----------|
| **Development** | `dashboard/.env.local` | `npm run dev` locally |
| **Production** | Vercel project env vars | Deployed app on Vercel |

No code changes are needed. The app already uses `process.env.NEXT_PUBLIC_*` and OAuth uses `window.location.origin`, so URLs adapt automatically:

- Local: `http://localhost:3000`
- Production: `https://your-app.vercel.app`

### Quick reference

| Action | Command / Place |
|--------|------------------|
| **Run locally** | `cd dashboard && npm run dev` (uses `.env.local`) |
| **Deploy / update** | Push to `main` on GitHub (Vercel auto-deploys) |
| **Change prod config** | Vercel → Project → Settings → Environment Variables |

---

## 4. Supabase Redirect URLs

To support both local and production:

1. **Supabase** → **Authentication** → **URL Configuration**.
2. **Redirect URLs** – add both:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_VERCEL_APP.vercel.app/auth/callback`

If you use Google OAuth, also add both in **Google Cloud Console** (Authorized JavaScript origins and redirect URIs).

---

## 5. Auto-Deploy on Push

After connecting GitHub to Vercel:

- Push to `main` → production deploy
- Push to other branches → Preview deploy (optional)

No extra setup is required. Each push triggers a new deployment.

---

## 6. Checklist

- [ ] Create GitHub repo
- [ ] Push code
- [ ] Import project in Vercel (root: `dashboard`)
- [ ] Add env vars in Vercel
- [ ] Add production URL to Supabase redirect URLs (and Google OAuth if used)
- [ ] Deploy
