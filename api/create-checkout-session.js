/**
 * POST /api/create-checkout-session  { email, county }
 *
 * Creates a Stripe Checkout Session for the Grid Permit Alerts paid tier
 * ($49/mo, same-day alerts + hearing calendar — see grid-permit-alerts/SPEC.md
 * section 0). Returns { url } for the browser to redirect to Stripe's own
 * hosted checkout page. No card data ever touches this server or Vercel.
 *
 * Uses Stripe's REST API directly via fetch (no `stripe` npm dependency),
 * matching this repo's existing pattern for Resend/Supabase in api/*.js
 * (see api/subscribe-permit-alerts.js, api/watch-articles.js) and
 * CLAUDE.md's "minimal dependencies" rule in the companion grid-permit-alerts
 * repo.
 *
 * Required Vercel environment variables:
 *   STRIPE_SECRET_KEY               Stripe secret key (sk_live_... or sk_test_...)
 *   STRIPE_PRICE_ID_LOUDOUN_VA      Price ID for the Loudoun County $49/mo recurring price
 *
 * See docs/STRIPE_SETUP.md for one-time Stripe dashboard setup.
 */
export const config = { maxDuration: 10 };

const SITE_URL = "https://usgridexplorer.com";

// One price ID per live county. Only Loudoun has a real product today --
// add a new COUNTY_PRICE_IDS entry (and a new STRIPE_PRICE_ID_* env var) as
// each additional market's scraper goes live, per SPEC.md's phased rollout.
const COUNTY_PRICE_IDS = {
  "loudoun-va": "STRIPE_PRICE_ID_LOUDOUN_VA"
};

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  if (!secretKey) {
    return response.status(500).json({ ok: false, message: "Payments are not configured yet." });
  }

  const ip = (request.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const window = (hits.get(ip) || []).filter((time) => now - time < WINDOW_MS);
  if (window.length >= MAX_PER_WINDOW) {
    return response.status(429).json({ ok: false, message: "Too many attempts. Please try again shortly." });
  }
  window.push(now);
  hits.set(ip, window);

  const body = typeof request.body === "object" && request.body ? request.body : safeParse(request.body);
  const email = String(body.email || "").trim().toLowerCase();
  const county = String(body.county || "loudoun-va").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ ok: false, message: "Please enter a valid email address." });
  }

  const priceEnvVar = COUNTY_PRICE_IDS[county];
  const priceId = priceEnvVar ? process.env[priceEnvVar] : "";
  if (!priceId) {
    return response.status(400).json({ ok: false, message: "This market isn't available for paid alerts yet." });
  }

  const regionPath = `/data-center-permits/${county}/`;
  const params = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    customer_email: email,
    client_reference_id: email,
    allow_promotion_codes: "true",
    success_url: `${SITE_URL}${regionPath}?checkout=success`,
    cancel_url: `${SITE_URL}${regionPath}?checkout=cancelled`,
    "subscription_data[metadata][county]": county,
    "metadata[county]": county
  });

  try {
    const upstream = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString(),
      signal: AbortSignal.timeout(10000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("[create-checkout-session] Stripe error:", payload?.error?.message || upstream.status);
      return response.status(502).json({ ok: false, message: "Could not start checkout. Please try again." });
    }
    return response.status(200).json({ ok: true, url: payload.url });
  } catch (error) {
    return response.status(502).json({ ok: false, message: "Could not reach the payment service. Please try again." });
  }
}

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
