/**
 * POST /api/subscribe-permit-alerts  { email, company, region }
 *
 * Lead capture for Grid Permit Alerts (the county-level data center permit
 * tracker at /data-center-permits/). Resend's free plan allows only ONE
 * audience per account, and that slot is already used by RESEND_AUDIENCE_ID
 * (the general US Grid Explorer weekly digest) -- so this reuses the SAME
 * audience rather than paying for a second one. To keep the two lists
 * distinguishable, every contact created here is tagged with a
 * `signup_source: "permit-alerts"` Contact Property, so you can filter by it
 * in Resend before sending a Broadcast and avoid emailing permit-alert leads
 * with newsletter content (or vice versa).
 *
 * IMPORTANT (one-time setup): the `signup_source` Contact Property must exist
 * on the Resend account first -- Audience -> Properties -> add property, key
 * `signup_source`, type `string` -- see docs/PERMIT_ALERTS_SETUP.md. If it's
 * missing, Resend rejects the tagged create, so this code falls back to
 * creating the contact WITHOUT the property rather than losing the signup.
 *
 * `region` is accepted for potential future use (e.g. a follow-up campaign
 * per market) but is currently only used for anti-spam logging, not stored.
 *
 * `company` is a honeypot field: real users never fill it, bots often do, so a
 * non-empty value is silently treated as success without storing anything.
 *
 * Required Vercel environment variables (same ones the main digest already
 * uses -- nothing new to add):
 *   RESEND_API_KEY       Resend API key
 *   RESEND_AUDIENCE_ID   Resend audience/contact-list id
 */
export const config = { maxDuration: 10 };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map();

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ ok: false, message: "Method not allowed." });
  }

  const apiKey = process.env.RESEND_API_KEY || "";
  const audienceId = process.env.RESEND_AUDIENCE_ID || "";
  if (!apiKey || !audienceId) {
    return response.status(500).json({ ok: false, message: "Signups are not configured yet." });
  }

  // Basic IP rate limiting to blunt abuse of a public endpoint.
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
  const honeypot = String(body.company || "").trim();
  const region = String(body.region || "").slice(0, 80);

  // Honeypot tripped: pretend success, store nothing.
  if (honeypot) {
    return response.status(200).json({ ok: true, message: "You're in. Watch your inbox for the first alert." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return response.status(400).json({ ok: false, message: "Please enter a valid email address." });
  }

  try {
    let upstream = await createContact(apiKey, audienceId, email, true);

    // If the signup_source property hasn't been created in Resend yet, the
    // tagged request is rejected -- retry once untagged so the lead is still
    // captured instead of silently lost.
    if (!upstream.ok && upstream.status !== 409) {
      const detail = await upstream.text().catch(() => "");
      if (/propert/i.test(detail)) {
        console.warn("[subscribe-permit-alerts] signup_source property missing in Resend; falling back to untagged contact");
        upstream = await createContact(apiKey, audienceId, email, false);
      } else if (/already exists|contact.*exist/i.test(detail)) {
        return response.status(200).json({ ok: true, message: "You're already on the list — thanks!" });
      }
    }

    // Resend returns 200/201 on create and treats an existing contact as a
    // conflict; either way the address is on the list, so report success.
    if (upstream.ok || upstream.status === 409) {
      console.log(`[subscribe-permit-alerts] new signup for region: ${region || "unspecified"}`);
      return response.status(200).json({ ok: true, message: "You're in. Watch your inbox for the first alert." });
    }
    return response.status(502).json({ ok: false, message: "Could not save your signup. Please try again." });
  } catch (error) {
    return response.status(502).json({ ok: false, message: "Could not reach the signup service. Please try again." });
  }
}

function createContact(apiKey, audienceId, email, tagSource) {
  const payload = { email, unsubscribed: false };
  if (tagSource) {
    payload.properties = { signup_source: "permit-alerts" };
  }
  return fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000)
  });
}

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
