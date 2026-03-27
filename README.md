# Garden Environment Monitoring (LoRaWAN + TTN + Supabase + Vercel)

Hardware setup, cloud config, and dashboard for a LoRaWAN garden monitoring system. Sensors are in the garden (no internet); the gateway is in the house (with internet). Data flows: **Sensors → Gateway → The Things Network → Supabase → Vercel dashboard**.

## Materials (summary)

| Item | Part | Purpose |
|------|------|--------|
| 1 | Dragino LHT65N | Temperature & humidity |
| 2 | Dragino SE01-LB | Soil moisture & EC |
| 3 | Dragino Soil pH | Soil pH |
| 4 | Dragino LG308N | LoRaWAN gateway (house) |
| 5 | LoRaWAN PIR motion (×2) | Visitor count |
| 6 | Dragino SW3L-LB | Water flow |
| 7 | Dragino DR-PH01 | Water pH |
| 8 | Dragino PS-LB | Water depth (pressure) |

## Repo structure

- **`docs/`**
  - **SETUP-GUIDE.md** – Hardware placement, gateway config, TTN, Supabase, Vercel.
  - **VERCEL-DEPLOYMENT.md** – GitHub repo setup, Vercel deploy, auto-deploy on push, dev vs prod.
  - **TTN-WEBHOOK-SUPABASE.md** – Sending TTN uplinks to Supabase (webhook / Edge Function).
  - **TTN-PAYLOAD-DECODERS.md** – Uplink decoders for each sensor type (copy into TTN).
  - **GOOGLE-OAUTH-SETUP.md** – Optional Google Sign-In setup.
- **`supabase/`**
  - **schema.sql** – Tables `devices` and `sensor_readings`; run in Supabase SQL Editor.
  - **functions/ttn-webhook/`** – Edge Function that receives TTN webhooks and inserts into `sensor_readings`.
- **`dashboard/`** – Next.js app for Vercel; reads from Supabase and shows latest readings per device.

## Quick start

1. **Hardware**  
   - Put the **LG308N gateway** in the house (Ethernet to router, US915).  
   - Place sensors in the garden; ensure all are **US915**.

2. **The Things Network**  
   - Create an application (e.g. `garden-monitoring`).  
   - Register the gateway (Gateway EUI from the LG308N).  
   - Register each sensor as an end device; use the device IDs from `supabase/schema.sql` (e.g. `lht65n-temp-1`, `se01-soil-1`).  
   - Add payload decoders from `docs/TTN-PAYLOAD-DECODERS.md`.

3. **Supabase**  
   - Create a project.  
   - Run `supabase/schema.sql` in the SQL Editor.  
   - Deploy the Edge Function:  
     `supabase functions deploy ttn-webhook --project-ref <ref>`  
   - In TTN, add a webhook to:  
     `https://<project-ref>.supabase.co/functions/v1/ttn-webhook`  
     with header `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

4. **Dashboard**  
   - In `dashboard/`, copy `.env.local.example` to `.env.local` and set env vars.  
   - Run `npm install && npm run dev` for local dev.  
   - See [VERCEL-DEPLOYMENT.md](docs/VERCEL-DEPLOYMENT.md) for GitHub + Vercel setup and auto-deploy.  
   - Optional: Enable [Google Sign-In](docs/GOOGLE-OAUTH-SETUP.md) (free).

## Tech stack

- **The Things Network** – LoRaWAN network server, gateway and device management, webhooks.
- **Supabase** – Database and Edge Function for receiving TTN uplinks.
- **Vercel** – Hosting for the Next.js dashboard.

All details (antenna placement, decoder byte layout, RLS, etc.) are in the docs and schema.
