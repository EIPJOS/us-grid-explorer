# Grid Permit Alerts — Lead Capture Setup

Pages: `/data-center-permits/` (hub) and `/data-center-permits/{region}/` (Loudoun
County, VA live now; Dallas–Fort Worth, Phoenix, Chicago, Atlanta listed as
"coming soon" waitlist pages).

This is lead capture only. **It reuses the existing `RESEND_AUDIENCE_ID`** (the
same one the weekly digest uses) rather than a separate audience — Resend's
free plan only allows one audience per account, and a second one requires the
$40/mo Pro plan. To keep the two lists distinguishable, every contact created
here is tagged with a `signup_source: permit-alerts` Contact Property, so you
can filter it out in Resend before sending a Broadcast and never accidentally
email permit-alert leads with newsletter content (or vice versa). Signups here
do **not** automatically receive the real weekly Grid Permit Alerts digest —
that's sent separately from the `grid-permit-alerts` repo
(`python -m pipeline.digest`). This page's job is purely to validate demand and
build a list you follow up with manually.

If demand grows enough to justify it, upgrading to Resend Pro and giving this
its own dedicated audience is a clean follow-up — not needed to launch.

## One-time setup

### 1. Create the `signup_source` Contact Property
In Resend: **Audience → Properties → Add property**.
- Key: `signup_source`
- Type: `string`
- Fallback value: `newsletter` (so existing/older contacts read as the default
  list if you ever filter by this property)

If you skip this step, signups still work — the code falls back to creating
the contact without the tag — but you'll lose the ability to tell the two
lists apart until you add it.

### 2. Environment variables
None needed. This reuses `RESEND_API_KEY` and `RESEND_AUDIENCE_ID`, both
already configured in Vercel for the weekly digest.

No sending-domain verification is needed for this endpoint — it only writes
contacts to Resend, it doesn't send email itself.

### 3. Test
1. Deploy, then open `/data-center-permits/loudoun-va/` and submit a test email
   in the signup form.
2. Check **Resend → Audience → Contacts**, find your test address, and confirm
   its `signup_source` property (Properties tab or contact detail view) reads
   `permit-alerts`.

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
