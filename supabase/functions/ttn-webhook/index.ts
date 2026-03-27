// Supabase Edge Function: receive TTN webhook and insert into sensor_readings
// Deploy: supabase functions deploy ttn-webhook --project-ref <ref>
/// <reference path="./deno.d.ts" />
// @ts-ignore Deno resolves URL imports at runtime; IDE TypeScript does not.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TTNUplink {
  end_device_ids?: { device_id?: string };
  uplink_message?: {
    decoded_payload?: Record<string, unknown>;
    received_at?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let body: TTNUplink;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const deviceId = body.end_device_ids?.device_id;
  const decoded = body.uplink_message?.decoded_payload;
  const receivedAt = body.uplink_message?.received_at;

  if (!deviceId) {
    return new Response(JSON.stringify({ error: "Missing device_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = decoded && typeof decoded === "object" ? decoded : {};
  const row = {
    device_id: deviceId,
    payload,
    received_at: receivedAt || new Date().toISOString(),
  };

  const { error: insertError } = await supabase.from("sensor_readings").insert(row);

  if (insertError) {
    console.error("Insert error:", insertError);
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
