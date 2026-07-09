/**
 * POST /api/stripe-webhook
 *
 * Stripe webhook receiver for Grid Permit Alerts. Verifies the request came
 * from Stripe (HMAC signature check, implemented by hand below -- see the
 * note on dependencies), then keeps the `subscribers` table (grid-permit-alerts
 * SPEC.md section 4 / db/schema.sql) in sync with the real subscription state:
 *
 *   checkout.session.completed   -> upsert subscribers row, tier = 'paid'
 *   customer.subscription.deleted -> downgrade existing row to tier = 'free'
 *                                     (never deletes the row -- they keep
 *                                     getting the free weekly digest, and
 *                                     resubscribing is a normal upsert)
 *
 * This is the ONLY place a subscriber's tier flips to 'paid'. pipeline/digest.py
 * (grid-permit-alerts repo) just reads whatever `tier` is already in the row --
 * it has no Stripe awareness and never needs any.
 *
 * No `stripe` npm dependency: signature verification is Stripe's documented
 * HMAC-SHA256 scheme (https://stripe.com/docs/webhooks#verify-manually),
 * implemented with Node's built-in `crypto`, matching this repo's existing
 * "plain fetch, no vendor SDKs" pattern in api/*.js.
 *
 * Required Vercel environment variables:
 *   STRIPE_WEBHOOK_SECRET   Signing secret for this endpoint (whsec_...)
 *   SUPABASE_URL            Same Supabase project the Python pipeline uses
 *   SUPABASE_SERVICE_KEY    Service-role key (NOT the anon key) -- this
 *                           endpoint needs write access to `subscribers`,
 *                           which is locked down from the public anon key
 *                           by Row Level Security. This is a new env var;
 *                           api/watch-articles.js only ever used the anon key.
 *
 * See docs/STRIPE_SETUP.md for one-time Stripe dashboard setup (registering
 * this endpoint's URL and getting the webhook secret).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

// Native Vercel Node function (not Next.js), but `config.api.bodyParser` is
// honored the same way -- disable it so we can read the exact raw bytes
// Stripe signed. Parsing request.body as JSON first would let whitespace/key
// -order differences silently break signature verification.
export const config = { api: { bodyParser: false }, maxDuration: 10 };

const TOLERANCE_SECONDS = 5 * 60; // reject events older than 5 minutes (replay protection)

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).send("Method not allowed");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    console.error("[stripe-webhook] missing required environment variables");
    return response.status(500).send("Webhook not configured");
  }

  let rawBody;
  try {
    rawBody = await readRawBody(request);
  } catch {
    return response.status(400).send("Could not read request body");
  }

  const signatureHeader = request.headers["stripe-signature"] || "";
  if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    console.error("[stripe-webhook] signature verification failed");
    return response.status(400).send("Invalid signature");
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return response.status(400).send("Invalid JSON");
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object, supabaseUrl, serviceKey);
    } else if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object, supabaseUrl, serviceKey);
    }
    // Unhandled event types are acknowledged with 200 (per Stripe's own
    // recommendation) rather than treated as errors -- we only subscribed to
    // the two events above in the Stripe dashboard, but Stripe may add
    // related event types to the same webhook in the future.
    return response.status(200).json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] handler error:", error instanceof Error ? error.message : error);
    // 500 so Stripe retries automatically (it retries failed webhooks on a
    // backoff schedule for up to 3 days) instead of silently losing the event.
    return response.status(500).json({ received: false });
  }
}

async function handleCheckoutCompleted(session, supabaseUrl, serviceKey) {
  const email = String(session.customer_email || session.customer_details?.email || "").trim().toLowerCase();
  const customerId = session.customer;
  const county = session.metadata?.county || "loudoun-va";
  if (!email || !customerId) {
    throw new Error(`checkout.session.completed missing email or customer id (session ${session.id})`);
  }

  const upstream = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      "Content-Type": "application/json",
      // Upsert on the unique `email` column (db/schema.sql: `email text unique
      // not null`) so a returning paid customer updates their existing free
      // row instead of erroring on the unique constraint.
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({
      email,
      tier: "paid",
      stripe_customer_id: customerId,
      counties: [countyToCode(county)],
      unsubscribed_at: null
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`Supabase upsert failed (${upstream.status}): ${detail.slice(0, 300)}`);
  }
  console.log(`[stripe-webhook] upgraded ${email} to paid tier (county: ${county})`);
}

async function handleSubscriptionDeleted(subscription, supabaseUrl, serviceKey) {
  const customerId = subscription.customer;
  if (!customerId) return;

  const upstream = await fetch(
    `${supabaseUrl}/rest/v1/subscribers?stripe_customer_id=eq.${encodeURIComponent(customerId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ tier: "free" }),
      signal: AbortSignal.timeout(10000)
    }
  );
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new Error(`Supabase downgrade failed (${upstream.status}): ${detail.slice(0, 300)}`);
  }
  console.log(`[stripe-webhook] downgraded customer ${customerId} to free tier (subscription canceled)`);
}

// `county` route slugs (e.g. "loudoun-va") match permitAlertsRoutes in
// scripts/site-shell.mjs; `counties` in db/schema.sql stores short codes
// (e.g. "loudoun") matching pipeline/digest.py's expectations.
function countyToCode(county) {
  return String(county).split("-")[0] || "loudoun";
}

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

/**
 * Manual implementation of Stripe's documented webhook signature scheme:
 * https://stripe.com/docs/webhooks#verify-manually
 *
 * Header format: "t=<unix_timestamp>,v1=<hex_hmac>[,v0=<hex_hmac>]"
 * Expected signature = HMAC-SHA256(webhookSecret, `${timestamp}.${rawBody}`)
 */
function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const providedSignature = parts.v1;
  if (!timestamp || !providedSignature) return false;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
