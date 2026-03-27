# Keys You Need, Run Commands, and TTN Connection

## 1. All keys you need

| Where | Key | Use |
|-------|-----|-----|
| **Supabase** → Project Settings → API | **Project URL** | Dashboard + Edge Function |
| **Supabase** → Project Settings → API | **anon public** | Dashboard (browser) – already in `dashboard/.env.local` |
| **Supabase** → Project Settings → API | **service_role** (secret) | TTN webhook only – never put in frontend |
| **TTN** | No API key | You log in at thethingsnetwork.org; gateway and devices use LoRaWAN keys (App EUI, App Key, etc.) |

- **Dashboard**: needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `dashboard/.env.local` (done).
- **TTN → Supabase webhook**: when you add the webhook in TTN, set the header `Authorization: Bearer <service_role key>` so the Edge Function can write to the database.

---

## 2. Run command (dashboard locally)

From the project root or from `dashboard`:

```powershell
cd "C:\Users\Thi Huyen Hoang\Documents\Humber\Winter 2026\SEMP\dashboard"
npm install
npm run dev
```

Then open **http://localhost:3000** – you’ll see the login screen, then the dashboard after signing in.

---

## 3. How to connect to The Things Network

### Step 1: Create a TTN account and application

1. Go to **https://www.thethings.network/** and sign up.
2. Open **Console** → **Applications** → **Add application**.
3. Application ID: e.g. `garden-monitoring` → Create.

### Step 2: Register your gateway (LG308N in the house)

1. In the application: **Gateways** → **Add gateway**.
2. **Gateway EUI**: from the sticker on the LG308N or its web UI (e.g. `A84041FFFF123456`).
3. **Frequency plan**: **United States 902–928 MHz (US915)**.
4. Save. Status will show **Connected** once the gateway is powered, on your Wi‑Fi/Ethernet, and configured for TTN.

### Step 3: Configure the gateway for TTN

1. On your network, find the gateway’s IP (router’s DHCP client list or sticker).
2. In a browser open `http://<gateway-ip>`.
3. In the gateway UI set:
   - **LoRaWAN / Network**: **The Things Network**.
   - **Region**: **US915**.
   - Use the **Gateway EUI** you registered in TTN (and gateway key if the UI asks for it).
4. Save. In TTN the gateway should change to **Connected**.

### Step 4: Register each sensor (end device)

For each sensor (LHT65N, SE01-LB, soil pH, etc.):

1. In TTN: **End devices** → **Add end device** → **Manually**.
2. **Frequency plan**: US915.
3. **LoRaWAN version**: 1.0.x or 1.1.x (see sensor manual; Dragino often 1.0.x).
4. **Join EUI / App EUI / App Key**: from the sensor label or manual; or generate in TTN and then enter the same values into the sensor if it supports key entry.
5. **End device ID**: e.g. `lht65n-temp-1`, `se01-soil-1`, `soil-ph-1`, `water-ph-1`, `sw3l-flow-1`, `ps-pressure-1`, `pir-motion-1`, `pir-motion-2`.
6. Save.

### Step 5: Add payload decoders (optional but recommended)

So TTN sends decoded JSON to Supabase:

1. In your TTN application: **Payload formatters** → **Uplink**.
2. Add a decoder for each device type (see `docs/TTN-PAYLOAD-DECODERS.md` for examples).

### Step 6: Send TTN data to Supabase (webhook)

1. Deploy the Supabase Edge Function (once):  
   `supabase functions deploy ttn-webhook --project-ref mhvezgzyebdjiskwooxp`  
   (use your **service_role** key in Supabase dashboard when prompted if needed.)
2. In TTN: **Integrations** → **Webhooks** → **Add webhook**.
3. **Webhook ID**: e.g. `supabase-garden`.
4. **Base URL**: use **only the origin** (no path), so TTN accepts it:
   ```
   https://mhvezgzyebdjiskwooxp.supabase.co
   ```
5. **Enabled event types** → enable **Uplink message** → in that event, set **Path** to:
   ```
   /functions/v1/ttn-webhook
   ```
6. **Headers** (add in the webhook form):
   - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`
   - `Content-Type`: `application/json`
7. Save. Uplinks will be sent to `Base URL` + `Path` = `https://mhvezgzyebdjiskwooxp.supabase.co/functions/v1/ttn-webhook`.

---

For full hardware and decoder details, see **SETUP-GUIDE.md** and **TTN-PAYLOAD-DECODERS.md**.
