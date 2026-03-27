# TTN Webhook → Supabase

This doc describes how to send The Things Network uplinks into Supabase so the dashboard can display them.

## Option A: Supabase Edge Function (recommended)

An Edge Function receives the TTN webhook POST, parses the body, and inserts into `sensor_readings`.

### 1. Create the function

In your project, the function lives at `supabase/functions/ttn-webhook/index.ts`. Deploy with:

```bash
supabase functions deploy ttn-webhook --project-ref <your-project-ref>
```

### 2. TTN webhook configuration

- **URL**: `https://<project-ref>.supabase.co/functions/v1/ttn-webhook`
- **Method**: POST
- **Headers**:
  - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`

TTN sends a JSON body like (simplified):

```json
{
  "end_device_ids": { "device_id": "lht65n-temp-1", ... },
  "uplink_message": {
    "decoded_payload": { "temperature": 22.5, "humidity": 65 },
    "received_at": "2025-02-01T12:00:00Z"
  }
}
```

The Edge Function reads `end_device_ids.device_id` and `uplink_message.decoded_payload`, then inserts one row into `sensor_readings` with `device_id`, `payload` (decoded_payload), and `received_at` (from TTN or `now()`).

### 3. Ensure devices exist

Run the seed in `supabase/schema.sql` so every TTN `device_id` has a row in `devices`. The Edge Function can optionally insert missing devices on first sight.

---

## Option B: PostgREST with a view (no Edge Function)

If you prefer not to use Edge Functions:

1. Expose an RPC or a table that accepts inserts (e.g. a table `ttn_uplinks_raw` with columns `body jsonb`, `received_at timestamptz`).
2. Use a database trigger or a scheduled job to parse `body` and insert into `sensor_readings`.
3. In TTN, set webhook URL to `https://<project-ref>.supabase.co/rest/v1/ttn_uplinks_raw` with header `Prefer: return=minimal` and `Authorization` / `apikey`. Body = TTN’s full JSON.

Option A is simpler to maintain and keeps parsing logic in one place.

---

## Payload shapes (per device type)

Use these field names in your TTN decoders so the dashboard can show them consistently:

| Device type            | Example decoded_payload |
|------------------------|-------------------------|
| temperature_humidity   | `{ "temperature": 22.5, "humidity": 65 }` |
| soil_moisture         | `{ "moisture": 35, "ec": 1.2 }` |
| soil_ph / water_ph    | `{ "ph": 6.8 }` |
| flow                  | `{ "flow_l": 12.5, "pulses": 5625 }` |
| pressure              | `{ "depth_cm": 45, "pressure_kpa": 4.4 }` |
| motion                | `{ "motion": true }` or `{ "count": 1 }` |

Store the full `decoded_payload` in `sensor_readings.payload` (jsonb). The dashboard can then read `payload->>'temperature'`, `payload->>'humidity'`, etc.
