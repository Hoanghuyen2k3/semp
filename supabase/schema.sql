-- Garden Environment Monitoring - Supabase schema
-- Run this in Supabase SQL Editor

-- Devices (TTN end devices)
CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,   -- TTN End Device ID (e.g. lht65n-temp-1)
  name text,
  type text,                         -- temperature_humidity, soil_moisture, soil_ph, water_ph, flow, pressure, motion
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sensor readings (one row per uplink)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  payload jsonb NOT NULL,            -- decoded payload from TTN (e.g. { temperature: 22.5, humidity: 65 })
  received_at timestamptz DEFAULT now(),
  raw_frm_payload text               -- optional: hex payload if you want to keep raw
);

-- Index for fast time-range and device queries (dashboard)
CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_received
  ON public.sensor_readings (device_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_received
  ON public.sensor_readings (received_at DESC);

-- Optional: RLS (Row Level Security) - enable if you add auth to the dashboard
-- ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anon read" ON public.devices FOR SELECT USING (true);
-- CREATE POLICY "Allow anon read" ON public.sensor_readings FOR SELECT USING (true);
-- Service role (webhook) can insert regardless of RLS.

-- Seed devices (match your TTN End Device IDs)
INSERT INTO public.devices (device_id, name, type) VALUES
  ('lht65n-temp-1', 'Air Temp & Humidity', 'temperature_humidity'),
  ('se01-soil-1', 'Soil Moisture & EC', 'soil_moisture'),
  ('soil-ph-1', 'Soil pH', 'soil_ph'),
  ('water-ph-1', 'Water pH', 'water_ph'),
  ('sw3l-flow-1', 'Water Flow', 'flow'),
  ('ps-pressure-1', 'Water Depth (Pressure)', 'pressure'),
  ('pir-motion-1', 'Visitor Count 1', 'motion'),
  ('pir-motion-2', 'Visitor Count 2', 'motion')
ON CONFLICT (device_id) DO NOTHING;
