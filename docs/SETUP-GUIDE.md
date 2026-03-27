# Garden Environment Monitoring – Setup Guide

This guide walks you through: **hardware placement**, **The Things Network (TTN)**, **Supabase**, and a **Vercel dashboard**.

---

## 1. Architecture Overview

```
[Garden - no internet]
  LHT65N (temp/humidity)  ──┐
  SE01-LB (soil moisture) ──┤
  Soil pH sensor          ──┼──► LoRa radio ──► [House - internet]
  Water pH (DR-PH01)      ──┤                    LG308N Gateway
  SW3L-LB (flow)          ──┤                         │
  PS-LB (pressure/depth)  ──┤                         │ Ethernet/Wi‑Fi
  PIR motion (×2)         ──┘                         ▼
                                              The Things Network
                                                        │
                                                        ▼ Webhook
                                              Supabase (database)
                                                        │
                                                        ▼
                                              Vercel dashboard
```

- **Sensors**: In the garden, battery-powered, send over LoRa (US915).
- **Gateway (LG308N)**: In the house, connected to your router; forwards LoRa → TTN over the internet.
- **TTN**: Receives uplinks, runs payload decoders, can forward to Supabase via HTTP webhook.
- **Supabase**: Stores time-series and device metadata.
- **Vercel**: Hosts the Next.js dashboard that reads from Supabase.

---

## 2. Hardware Setup

### 2.1 Gateway (LG308N) – in the house

1. **Placement**
   - Near a window or wall facing the garden to improve LoRa link.
   - Connect to your home router via **Ethernet** (recommended) or Wi‑Fi.

2. **Power & first boot**
   - Power with the included adapter.
   - Wait for LEDs to stabilize (boot complete).

3. **Access the gateway**
   - Find its IP on your router’s DHCP client list (device name often contains “Dragino” or “LG308”).
   - In a browser: `http://<gateway-ip>` (e.g. `http://192.168.1.100`).

4. **Configure for TTN**
   - In the web UI, set **LoRaWAN / Network**: **The Things Network**.
   - Set **Region**: **US915** (must match your sensors).
   - You will need the **Gateway EUI** and (if required) **Gateway key** from the TTN console in the next section; enter them in the gateway’s TTN settings and save.

5. **Antenna**
   - Use the supplied antenna; keep cable away from power cables to reduce noise.

### 2.2 Sensors – in the garden

| Item | Sensor | Placement | Notes |
|------|--------|-----------|--------|
| 1 | LHT65N (temp/humidity) | Shaded, away from direct sun/rain | Air temp & humidity |
| 2 | SE01-LB (soil moisture/EC) | Probe in soil at root zone | Bury probe only; keep electronics above ground |
| 3 | Soil pH | In soil at measurement depth | Calibrate per manual |
| 4 | DR-PH01 (water pH) | In water line or tank | Follow wiring and submersion limits |
| 5 | SW3L-LB (flow) | Inline in water pipe (G½”/DN15) | 450 pulses = 1 L |
| 6 | PS-LB (pressure) | For water depth: use tubing to submerged end | Converts pressure → depth |
| 7–8 | PIR motion (×2) | Entrances/paths to count visitors | Adjust sensitivity and mounting height |

- **US915**: Ensure every device is set to **US915** and the same sub-band if your region uses sub-bands.
- **Batteries**: Install/charge as per each datasheet; note high-capacity cells (e.g. 8500 mAh) for long interval use.
- **Testing**: After TTN and device registration (below), check that uplinks appear in TTN before moving on to Supabase.

---

## 3. The Things Network (TTN)

### 3.1 Create an account and gateway

1. Go to [https://www.thethings.network/](https://www.thethings.network/) and create an account.
2. **Console** → **Go to application** (or create an application, e.g. `garden-monitoring`).
3. **Gateways** → **Add gateway**:
   - **Gateway EUI**: From the sticker on the LG308N or its web UI (format `XXXXXXXXXXXXXXXX`).
   - **Frequency plan**: **United States 902–928 MHz (US915)**.
   - Save. TTN will show the gateway as “Connected” once the LG308N is online and configured with this EUI.

### 3.2 Register end devices (sensors)

For each physical sensor:

1. **End devices** → **Add end device**.
2. Choose **Manually**.
3. Set:
   - **Frequency plan**: US915.
   - **LoRaWAN version**: 1.0.x or 1.1.x as per device (Dragino usually 1.0.x).
4. **Join EUI / App EUI / App Key**: Use the values from the sensor label or config (or generate in TTN and then enter into the device if it supports manual key entry).
5. **End device ID**: e.g. `lht65n-temp-1`, `se01-soil-1`, `soil-ph-1`, `water-ph-1`, `sw3l-flow-1`, `ps-pressure-1`, `pir-motion-1`, `pir-motion-2`.
6. Save.

Repeat for all 8 devices (2 PIRs = 2 end devices). Note each **Device ID**; you’ll use them in payload decoders and in Supabase.

### 3.3 Payload decoders (uplink)

TTN decodes raw bytes into JSON so the webhook sends readable fields (e.g. `temperature`, `humidity`, `moisture`). Decoders are **per device type** (or per device if you prefer).

- In your application, open **Payload formatters** → **Uplink**.
- Add formatters for each device type. Example for **LHT65N** (temperature/humidity):

```javascript
function decodeUplink(input) {
  var data = {};
  if (input.bytes.length >= 4) {
    data.temperature = (input.bytes[0] << 8 | input.bytes[1]) / 100;
    data.humidity = (input.bytes[2] << 8 | input.bytes[3]) / 100;
  }
  return { data: data };
}
```

- For **SE01-LB** (soil moisture/EC), **soil pH**, **water pH**, **flow**, **pressure**, and **PIR**, use the payload formats from the Dragino product manuals or TTN documentation and add decoders so that `decoded.payload` in the webhook contains the same field names you use in the dashboard (e.g. `moisture`, `ec`, `ph`, `flow_l`, `depth_cm`, `motion`).

You can start with one device (e.g. LHT65N), verify in TTN **Live data** that decoded payload looks correct, then add the rest.

### 3.4 Webhook to Supabase

You will send each uplink to Supabase via an HTTP webhook so you don’t need a separate server.

1. **Integrations** → **Webhooks** → **Add webhook**.
2. **Webhook ID**: e.g. `supabase-garden`.
3. **Base URL**: use **only the origin** (no path): `https://<project-ref>.supabase.co`
4. **Enabled event types** → enable **Uplink message** → set **Path** to `/functions/v1/ttn-webhook`.
5. **Headers**:
   - `Authorization`: `Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
   - `Content-Type`: `application/json`.
6. Save. TTN will POST uplinks to Base URL + Path.

---

## 4. Supabase Setup

### 4.1 Project

1. [https://supabase.com](https://supabase.com) → New project (e.g. `garden-monitoring`).
2. Note: **Project URL**, **anon key**, **service_role key** (for the webhook).

### 4.2 Tables (see `supabase/schema.sql`)

- **devices**: `id`, `device_id` (TTN Device ID), `name`, `type`, `location`.
- **sensor_readings**: `id`, `device_id`, `payload` (JSONB), `received_at` (timestamptz).

Run the SQL from `supabase/schema.sql` in the SQL Editor so the webhook (or Edge Function) can insert into these tables.

### 4.3 Receive TTN webhooks (Edge Function)

Create an Edge Function that:

1. Receives POST from TTN (body = TTN uplink message).
2. Reads `end_device_ids.device_id` and `uplink_message.decoded_payload` (or `uplink_message.frm_payload` if you decode elsewhere).
3. Inserts one row into `sensor_readings` with `device_id`, `payload`, `received_at`.
4. Returns 200 so TTN doesn’t retry.

Then in TTN, set the webhook URL to:  
`https://<project-ref>.supabase.co/functions/v1/ttn-webhook`  
and use the same headers (Authorization, apikey) with the **service_role** key so the function can insert.

Details and example code are in `docs/TTN-WEBHOOK-SUPABASE.md` and in the `supabase/functions` folder.

---

## 5. Dashboard (Vercel)

- The dashboard is a **Next.js** app in the `dashboard/` folder.
- It uses **Supabase** (client) to read from `devices` and `sensor_readings` and show:
  - Latest values per sensor (temp, humidity, soil moisture, pH, flow, depth, motion).
  - Simple time-series or last-24h views if you add charts.
- **Deploy on Vercel**:
  1. Push the repo to GitHub.
  2. In Vercel, import the repo and set root to `dashboard/` (or the repo root if the app is at root).
  3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  4. Deploy. Vercel will build and host the dashboard.

---

## 6. Checklist

- [ ] Gateway LG308N in house, Ethernet to router, US915, registered on TTN, status “Connected”.
- [ ] All sensors powered and configured for US915; registered as end devices in TTN.
- [ ] Payload decoders added and tested (Live data shows decoded payload).
- [ ] Supabase project created; `devices` and `sensor_readings` tables created.
- [ ] Edge Function `ttn-webhook` deployed; TTN webhook points to it with correct auth.
- [ ] Test: trigger an uplink from one sensor → check Supabase `sensor_readings` for a new row.
- [ ] Dashboard deployed on Vercel with Supabase env vars; verify latest data on the UI.

---

## 7. References

- [Dragino LoRaWAN products](https://www.dragino.com/products/lora-lorawan.html) – datasheets and payload formats.
- [The Things Network – US915](https://www.thethingsnetwork.org/docs/lorawan/frequency-plans/).
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions).
- [TTN Webhooks](https://www.thethingsnetwork.org/docs/integrations/webhooks/).
