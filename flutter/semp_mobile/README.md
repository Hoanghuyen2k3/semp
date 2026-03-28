# SEMP mobile (Flutter)

Companion app for the **Smart Eco-Monitoring Platform**. Uses the same **Supabase** project as the Next.js dashboard for authentication and `sensor_readings`. Optionally calls your **deployed dashboard** HTTPS URL for Next API routes (`/api/weather`, `/api/chat`) so OpenWeather and Hugging Face keys stay on the server.

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable)
- Same Supabase project as `dashboard/` (`NEXT_PUBLIC_SUPABASE_*`)

## Run

From this folder:

```bash
cd flutter/semp_mobile
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGci...
```

**Optional** — weather card + assistant (HTTP to your live Next app, no trailing slash):

```bash
flutter run \
  --dart-define=SUPABASE_URL=... \
  --dart-define=SUPABASE_ANON_KEY=... \
  --dart-define=DASHBOARD_API_BASE=https://your-deployment.vercel.app
```

For **Google Sign-In** on mobile you must configure OAuth redirect URLs in the Supabase dashboard and add platform-specific deep links (`supabase_flutter` docs). This template uses **email + password** only, matching the web form sign-in path.

## Architecture

| Feature | Where it runs |
|--------|----------------|
| Login / session | Supabase Auth (`supabase_flutter`) |
| Sensor list | Supabase Postgres `sensor_readings` (RLS same as web) |
| Weather summary | `GET {DASHBOARD_API_BASE}/api/weather` (optional) |
| Assistant | `POST {DASHBOARD_API_BASE}/api/chat` (optional) |

To add **plant health** or other Next routes, extend `lib/services/next_js_api.dart` and mirror the JSON shape from `dashboard/src/app/api/...`.

## Parity with the web dashboard

The web UI (charts, alerts, predictions) is not duplicated here yet: this app focuses on **readings + optional API proxies**. You can evolve Flutter UI over time or keep using the web app for heavy analytics.
