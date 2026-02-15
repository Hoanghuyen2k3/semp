import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createBrowserClient(url, anonKey);

export type Device = {
  id: string;
  device_id: string;
  name: string | null;
  type: string | null;
  location: string | null;
};

export type SensorReading = {
  id: string;
  device_id: string;
  payload: Record<string, unknown>;
  received_at: string;
};
