/**
 * POST /api/subscribe-permit-alerts  { email, company, region }
 *
 * Lead capture for Grid Permit Alerts (the county-level data center permit
 * tracker at /data-center-permits/) -- deliberately a SEPARATE Resend audience
 * from RESEND_AUDIENCE_ID (the general US Grid Explorer weekly digest). Grid
 * Permit Alerts is a different product (county permit filings + hearing
 * calendars, eventually paid) with different content and cadence than the
 * free nationwide grid newsletter, so its leads shouldn't be mixed into that
 * list. One shared audience covers every region page (Loudoun live, others
 * "coming soon") -- `region` is accepted for potential future use (e.g. a
 * follow-up email campaign) but Resend's contact API has no custom-field slot
 * for it today, so it's currently only used for anti-spam logging, not stored.
 *
 * `company` is a honeypot field: real users never fill it, bots often do, so a
 * non-empty value is silently treated as success without storing anything.
 *
 * Required Vercel environment variables:
 *   RESEND_API_KEY                 Resend API key (can reuse the same key as
 *                                  the main digest -- it's just an API key,
 *                                  not tied to one audience)
 *   RESEND_PERMIT_ALERTS_AUDIENCE_ID   A NEW Resend audience id, created
 *                                  separately from RESEND_AUDIENCE_ID
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
  const audienceId = process.env.RESEND_PERMIT_ALERTS_AUDIENCE_ID || "";
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
    const upstream = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, unsubscribed: false }),
      signal: AbortSignal.timeout(8000)
    });

    // Resend returns 200/201 on create and treats an existing contact as a
    // conflict; either way the address is on the list, so report success.
    if (upstream.ok || upstream.status === 409) {
      console.log(`[subscribe-permit-alerts] new signup for region: ${region || "unspecified"}`);
      return response.status(200).json({ ok: true, message: "You're in. Watch your inbox for the first alert." });
    }
    const detail = await upstream.text().catch(() => "");
    if (/already exists|contact.*exist/i.test(detail)) {
      return response.status(200).json({ ok: true, message: "You're already on the list — thanks!" });
    }
    return response.status(502).json({ ok: false, message: "Could not save your signup. Please try again." });
  } catch (error) {
    return response.status(502).json({ ok: false, message: "Could not reach the signup service. Please try again." });
  }
}

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
