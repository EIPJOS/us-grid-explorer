# Grid Permit Alerts — Lead Capture Setup

Pages: `/data-center-permits/` (hub) and `/data-center-permits/{region}/` (Loudoun
County, VA live now; Dallas–Fort Worth, Phoenix, Chicago, Atlanta listed as
"coming soon" waitlist pages).

This is lead capture only — a separate Resend audience from the main
`RESEND_AUDIENCE_ID` weekly digest, since Grid Permit Alerts is a different
product (paid, county-specific permit tracking) with different content and
cadence than the free nationwide grid newsletter. Signups here do **not**
automatically become Grid Permit Alerts subscribers or receive the real weekly
digest — that digest is sent separately from the `grid-permit-alerts` repo
(`python -m pipeline.digest`). This page's job is purely to validate demand and
build a list you follow up with manually.

## One-time setup

### 1. Create a new Resend audience
1. In the same Resend account as the main digest: **Audiences → Create Audience**
   (e.g. "Grid Permit Alerts Waitlist") — copy its Audience ID.
2. You can reuse the existing `RESEND_API_KEY` — API keys aren't tied to one
   audience.

### 2. Environment variables

**Vercel** (Project → Settings → Environment Variables, all environments):

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Same key as the main digest (`re_...`) |
| `RESEND_PERMIT_ALERTS_AUDIENCE_ID` | The new audience ID from step 1 |

No sending-domain verification is needed for this endpoint — it only writes
contacts to Resend, it doesn't send email itself.

### 3. Test
1. Deploy, then open `/data-center-permits/loudoun-va/` and submit a test email
   in the signup form.
2. Check **Resend → Audiences → Grid Permit Alerts Waitlist → Contacts** — your
   test address should appear there within a few seconds.

## Regenerating the pages
These pages are static-generated at build time, same as state/region/guide
pages: `npm run generate:permit-alerts-pages` (also runs automatically as part
of `npm run build` via the `generate:pages` script). Edit the `regions` object
in `scripts/generate-permit-alerts-pages.mjs` to update copy, add real stats
once a region's scraper goes live, or add a 6th market.

## Adding a new region later
Add an entry to `permitAlertsRoutes` in `scripts/site-shell.mjs` and a matching
object in the `regions` map in `scripts/generate-permit-alerts-pages.mjs`.
Regions with `status: "coming_soon"` render a shorter waitlist-only page; once
a county's scraper is live (see the `grid-permit-alerts` repo), flip it to
`status: "live"` and add `stats`, `body`, and `sourceNote` like the Loudoun
entry.
