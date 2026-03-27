# TTN Payload Decoders (Uplink)

Use these in **The Things Network** → your Application → **Payload formatters** → **Uplink**. You can set one decoder per device type or per end device.

---

## LHT65N – Temperature & Humidity

Decoder name: `LHT65N` (assign to device `lht65n-temp-1`).

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 6) {
    data.battery_v = ((bytes[0] << 8 | bytes[1]) & 0x3FFF) / 1000;
    data.temperature = (bytes[2] << 24 >> 16 | bytes[3]) / 100;
    data.humidity = (bytes[4] << 8 | bytes[5]) / 10;
  }
  return { data: data };
}
```

Output: `{ temperature, humidity, battery_v }` – dashboard uses `temperature` and `humidity`.

---

## SE01-LB – Soil Moisture & EC

Check Dragino SE01-LB manual for exact byte layout. Example (adjust to your firmware):

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 4) {
    data.moisture = (bytes[0] << 8 | bytes[1]) / 10;  // verify from manual
    data.ec = (bytes[2] << 8 | bytes[3]) / 100;       // µS/cm
  }
  return { data: data };
}
```

---

## Soil pH / Water pH (Dragino)

Use the payload format from the sensor manual. Example placeholder:

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 2) {
    data.ph = (bytes[0] << 8 | bytes[1]) / 100;
  }
  return { data: data };
}
```

---

## SW3L-LB – Flow (450 pulses = 1 L)

Decode pulse count and convert to litres. Example:

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 4) {
    var pulses = bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
    data.pulses = pulses;
    data.flow_l = pulses / 450;
  }
  return { data: data };
}
```

---

## PS-LB – Pressure / Water Depth

Check manual for formula (pressure → depth). Example:

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 2) {
    data.pressure_kpa = (bytes[0] << 8 | bytes[1]) / 100;
    data.depth_cm = data.pressure_kpa * 10.2;  // approx: 1 kPa ≈ 10.2 cm water
  }
  return { data: data };
}
```

---

## PIR Motion Sensor

Typical format: one byte or two for count. Example:

```javascript
function decodeUplink(input) {
  var bytes = input.bytes;
  var data = {};
  if (bytes.length >= 1) {
    data.motion = bytes[0] > 0;
  }
  if (bytes.length >= 2) {
    data.count = bytes[0] << 8 | bytes[1];
  }
  return { data: data };
}
```

---

After saving decoders, check **Live data** in TTN to confirm `decoded_payload` matches what the dashboard expects (see `docs/TTN-WEBHOOK-SUPABASE.md` for field names).
