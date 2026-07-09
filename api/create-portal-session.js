/**
 * POST /api/create-portal-session  { email }
 *
 * Lets an existing paid subscriber manage or cancel their subscription
 * without a custom account UI (grid-permit-alerts/SPEC.md section 6's
 * "/account: ... Stripe customer portal link", simplified: email in, Stripe's
 * own hosted portal out -- no separate auth system to build or maintain).
 *
 * Looks up the subscriber's stripe_customer_id in Supabase, then creates a
 * Stripe Billing Portal session and returns { url } for the browser to
 * redirect to. Uses plain fetch against Stripe's and Supabase's REST APIs,
 * no vendor SDKs, matching the rest of api/*.js in this repo.
 *
 * Required Vercel environment variables (same ones api/stripe-webhook.js uses):
 *   STRIPE_SECRET_KEY       Stripe secret key
 *   SUPABASE_URL            Same Supabase project the Python pipeline uses
 *   SUPABASE_SERVICE_KEY    Service-role key -- needed to read stripe_customer_id
 *                           out of `subscribers`, which anon key cannot see
 *
 * See docs/STRIPE_SETUP.md.
 */
export const config = { maxDuration: 10 };

const SITE_URL = "https://usgridexplorer.com";
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  if (!secretKey || !supabaseUrl || !serviceKey) {
    return response.status(500).json({ ok: false, message: "Billing management is not configured yet." });
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ ok: false, message: "Please enter a valid email address." });
  }

  try {
    const lookup = await fetch(
      `${supabaseUrl}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=stripe_customer_id`,
      { headers: { apikey: serviceKey }, signal: AbortSignal.timeout(10000) }
    );
    if (!lookup.ok) throw new Error(`Supabase lookup returned HTTP ${lookup.status}`);
    const rows = await lookup.json();
    const customerId = rows?.[0]?.stripe_customer_id;
    if (!customerId) {
      // Same message whether the email doesn't exist or was never a paid
      // subscriber -- don't reveal which via response differences.
      return response.status(404).json({ ok: false, message: "We couldn't find an active paid subscription for that email." });
    }

    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${SITE_URL}/data-center-permits/`
    });
    const upstream = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
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
      console.error("[create-portal-session] Stripe error:", payload?.error?.message || upstream.status);
      return response.status(502).json({ ok: false, message: "Could not open billing management. Please try again." });
    }
    return response.status(200).json({ ok: true, url: payload.url });
  } catch (error) {
    return response.status(502).json({ ok: false, message: "Could not reach the billing service. Please try again." });
  }
}

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
