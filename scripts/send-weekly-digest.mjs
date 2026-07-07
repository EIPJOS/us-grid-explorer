/**
 * send-weekly-digest.mjs
 *
 * Builds a teaser-style weekly digest from the latest briefings and sends it to
 * the Resend audience as a broadcast. Every link points back to the site (with
 * UTM tags) rather than to the original source, so opens convert into on-site
 * pageviews — the whole point of the digest is to bring readers back.
 *
 * Article source of truth: Supabase (watch_articles) if configured, otherwise
 * the committed static batch at src/data/generated/daily-feed-batch.json. That
 * fallback means the digest works today even before Supabase is wired up.
 *
 * Required environment variables:
 *   RESEND_API_KEY       Resend API key
 *   RESEND_AUDIENCE_ID   Resend audience id (the subscriber list)
 *   RESEND_FROM          Verified sender, e.g. "US Grid Explorer <briefings@usgridexplorer.com>"
 *
 * Optional:
 *   SITE_URL             default "https://usgridexplorer.com"
 *   SUPABASE_URL         if set with the anon key, pull live articles
 *   SUPABASE_ANON_KEY
 *   DIGEST_LIMIT         default 6
 *   DIGEST_DAYS          only include items newer than N days (default 8; 0 = no filter)
 *   DIGEST_DRY_RUN       if set, build and print the HTML but do NOT send
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const RESEND_FROM = process.env.RESEND_FROM;
const SITE_URL = (process.env.SITE_URL || "https://usgridexplorer.com").replace(/\/+$/, "");
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const LIMIT = Number(process.env.DIGEST_LIMIT || 6);
const DAYS = Number(process.env.DIGEST_DAYS ?? 8);
const DRY_RUN = Boolean(process.env.DIGEST_DRY_RUN);

const FEED_URL = `${SITE_URL}/data-center-watch/`;

async function main() {
  const items = await loadArticles();
  if (!items.length) {
    console.log("[digest] No articles available; nothing to send.");
    return;
  }

  const selected = selectItems(items, LIMIT, DAYS);
  console.log(`[digest] ${items.length} article(s) available -> ${selected.length} selected for this send.`);
  for (const item of selected) console.log(`  - ${item.title}`);

  const subject = buildSubject(selected);
  const html = buildHtml(selected);

  if (process.env.DIGEST_OUT) {
    await writeFile(process.env.DIGEST_OUT, html, "utf8");
    console.log(`[digest] Wrote preview HTML to ${process.env.DIGEST_OUT}`);
  }

  if (DRY_RUN) {
    console.log("\n[digest] DRY RUN — not sending. Subject:\n  " + subject);
    console.log(`[digest] HTML length: ${html.length} chars`);
    return;
  }

  requireEnv();
  const broadcastId = await createBroadcast(subject, html);
  await sendBroadcast(broadcastId);
  console.log(`[digest] Sent broadcast ${broadcastId} to audience ${RESEND_AUDIENCE_ID}.`);
}

// ---------------------------------------------------------------------------
// Article loading
// ---------------------------------------------------------------------------

async function loadArticles() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const endpoint =
        `${SUPABASE_URL}/rest/v1/watch_articles` +
        `?select=id,title,url,published_date,summary,tags,source_name,importance_score,created_at` +
        `&status=eq.published&order=published_date.desc,created_at.desc&limit=40`;
      const response = await fetch(endpoint, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length) {
          console.log(`[digest] Loaded ${rows.length} article(s) from Supabase.`);
          return rows.map((row) => ({
            title: row.title,
            url: row.url,
            publishedDate: row.published_date,
            summary: row.summary,
            importanceScore: row.importance_score ?? 70,
            createdAt: row.created_at
          }));
        }
      }
      console.warn(`[digest] Supabase returned no rows (HTTP ${response.status}); falling back to static batch.`);
    } catch (error) {
      console.warn(`[digest] Supabase read failed (${error?.message ?? error}); falling back to static batch.`);
    }
  }

  const batchPath = join(HERE, "..", "src", "data", "generated", "daily-feed-batch.json");
  const batch = JSON.parse(await readFile(batchPath, "utf8"));
  console.log(`[digest] Loaded ${batch.items?.length ?? 0} article(s) from static batch.`);
  return (batch.items ?? []).map((item) => ({
    title: item.title,
    url: item.url,
    publishedDate: item.publishedDate,
    summary: item.summary,
    importanceScore: item.importanceScore ?? 70,
    createdAt: item.createdAt
  }));
}

function selectItems(items, limit, days) {
  const cutoff = days > 0 ? Date.now() - days * 86400000 : 0;
  const recent = items.filter((item) => {
    if (!cutoff) return true;
    const when = new Date(item.publishedDate || item.createdAt || 0).valueOf();
    return Number.isFinite(when) ? when >= cutoff : true;
  });
  const pool = recent.length ? recent : items;
  return [...pool]
    .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Email content
// ---------------------------------------------------------------------------

function buildSubject(items) {
  const lead = items[0]?.title || "This week in U.S. grid & data-center power";
  return `Grid brief: ${truncate(lead, 60)}`;
}

function trackedUrl(path) {
  const url = new URL(path);
  url.searchParams.set("utm_source", "digest");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "weekly");
  return url.href;
}

function buildHtml(items) {
  const cta = trackedUrl(FEED_URL);
  const rows = items.map((item, index) => {
    const teaser = truncate(stripTags(item.summary || ""), 150);
    return `
      <tr>
        <td style="padding:0 0 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="font:600 12px/1.2 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8a94a8;padding:0 0 6px;">
                ${index + 1}. ${escapeHtml(dateLabel(item.publishedDate))}
              </td>
            </tr>
            <tr>
              <td style="font:700 18px/1.35 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f1626;padding:0 0 8px;">
                <a href="${cta}" style="color:#0f1626;text-decoration:none;">${escapeHtml(item.title)}</a>
              </td>
            </tr>
            <tr>
              <td style="font:400 14px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#404a5c;padding:0 0 10px;">
                ${escapeHtml(teaser)}
              </td>
            </tr>
            <tr>
              <td style="font:600 13px/1.2 -apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:0;">
                <a href="${cta}" style="color:#1a6b3f;text-decoration:none;">Read the full briefing on US Grid Explorer &rarr;</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e8f0;">
        <tr>
          <td style="background:#0f1626;padding:22px 28px;">
            <div style="font:800 18px/1.2 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#dfff3f;">US Grid Explorer</div>
            <div style="font:600 12px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#96a1b9;letter-spacing:.04em;text-transform:uppercase;padding-top:4px;">Weekly grid &amp; data-center briefing</div>
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px 6px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#404a5c;">
            The developments moving U.S. power demand, data-center siting, and utility planning this week. Tap any story to read the full briefing.
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:6px 28px 30px;">
            <a href="${cta}" style="display:inline-block;background:#dfff3f;color:#111607;font:700 15px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;text-decoration:none;padding:14px 26px;border-radius:10px;">See all briefings &amp; the live map &rarr;</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f7f9fc;border-top:1px solid #e4e8f0;padding:18px 28px;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8a94a8;">
            You're receiving this because you subscribed at usgridexplorer.com.<br>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8a94a8;text-decoration:underline;">Unsubscribe</a> &middot;
            <a href="${trackedUrl(SITE_URL + "/")}" style="color:#8a94a8;text-decoration:underline;">Visit the site</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Resend broadcast API
// ---------------------------------------------------------------------------

async function createBroadcast(subject, html) {
  const response = await fetch("https://api.resend.com/broadcasts", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      audience_id: RESEND_AUDIENCE_ID,
      from: RESEND_FROM,
      subject,
      html,
      name: `Weekly digest ${new Date().toISOString().slice(0, 10)}`
    }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Resend create broadcast failed: HTTP ${response.status} ${await response.text()}`);
  const payload = await response.json();
  const id = payload?.id || payload?.data?.id;
  if (!id) throw new Error(`Resend create broadcast returned no id: ${JSON.stringify(payload)}`);
  return id;
}

async function sendBroadcast(id) {
  const response = await fetch(`https://api.resend.com/broadcasts/${id}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Resend send broadcast failed: HTTP ${response.status} ${await response.text()}`);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function requireEnv() {
  const missing = ["RESEND_API_KEY", "RESEND_AUDIENCE_ID", "RESEND_FROM"].filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    process.exit(1);
  }
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value, max) {
  const text = String(value ?? "").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateLabel(value) {
  if (!value) return "Recent";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Recent"
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

await main();
