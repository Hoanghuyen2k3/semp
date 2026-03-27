# Free Tier Limits – Is It Enough?

Yes, the **free plans** for TTN, Supabase, and Vercel are enough for your garden monitoring setup (8 sensors, 1 gateway, 1 dashboard), as long as you keep uplink frequency moderate.

---

## The Things Network (TTN) – Free

| Limit | Value | Your usage |
|-------|--------|------------|
| Uplink airtime | **30 seconds per device per 24 hours** | Each LoRa packet is ~50–200 ms. At 1 packet every 10–15 min you use well under 30 s/day per device. |
| Downlinks | 10 per device per 24 h | You’re only receiving uplinks; no issue. |
| Devices / gateways | Community fair use | 8 devices + 1 gateway is fine. |

**Recommendation:** Set sensor intervals to **≥ 10 minutes** (e.g. 10–30 min). Avoid sub‑minute intervals. Free tier is enough.

---

## Supabase – Free

| Limit | Value | Your usage |
|-------|--------|------------|
| Database storage | **500 MB** | Each reading is a small row (device_id, payload, timestamp). Millions of rows stay under 500 MB. |
| Database egress | **50 MB/day** | Dashboard fetches a few KB per load. Plenty for personal use. |
| **Edge Function invocations** | **1,000/day** | **This is the main constraint.** Each TTN uplink → 1 webhook → 1 invocation. |

**Math:** 1,000 invocations ÷ 8 devices ≈ **125 uplinks per device per day** → about one every **12 minutes** per device. If all sensors send every 10–15 min, you’re at or just over the limit. If they send every **15–30 min or 1 hour**, you stay safely under 1,000/day.

**Recommendation:** Use sensor report intervals of **15–30 minutes** (or longer). Then the free plan is enough. If you need sub‑10‑minute reporting, consider Supabase Pro or another webhook receiver (e.g. a small server that batches and writes to Supabase less often).

---

## Vercel – Free (Hobby)

| Limit | Value | Your usage |
|-------|--------|------------|
| Function invocations | 1M/month | Dashboard is mostly static/SSR; very low usage. |
| Bandwidth | 100 GB/month | Fine for a small dashboard. |
| Use case | Non‑commercial / personal | Garden monitoring fits. |

Free tier is enough for the dashboard.

---

## Summary

| Service | Free tier enough? | Constraint |
|---------|--------------------|------------|
| **TTN** | Yes | Keep uplink interval ≥ ~10 min per device. |
| **Supabase** | Yes | Keep total uplinks ≤ **~1,000/day** (e.g. 8 devices × every 15–30 min). |
| **Vercel** | Yes | No practical limit for this project. |

**Practical setup:** Configure sensors to report every **15–30 minutes** (or 1 hour for battery saving). You stay within all free limits and can run the system indefinitely on the free stack.
