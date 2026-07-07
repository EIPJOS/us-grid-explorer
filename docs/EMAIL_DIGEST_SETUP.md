# Weekly Email Digest — Setup Guide

Bring visitors back for ad revenue: capture emails on-site, then send a weekly
teaser digest that links every story back to `usgridexplorer.com`.

```
Signup form (Feeds → Briefings tab)  ──►  POST /api/subscribe  ──►  Resend audience
                                                                        │
GitHub Actions (Thu 14:00 UTC)  ──►  scripts/send-weekly-digest.mjs  ──►  Resend broadcast
   builds a teaser digest from the week's briefings (Supabase or static batch)
   every link carries ?utm_source=digest so returning traffic shows in Analytics
```

**Design principle:** the email shows headlines + a one-line teaser only. The
full summary lives on the site, so every open is an incentive to click through —
that click is the ad impression.

## One-time setup

### 1. Resend account (free)
1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/mo, 100/day).
2. **API Keys → Create API Key** — copy the key (starts with `re_`).
3. **Audiences → Create Audience** (e.g. "US Grid Explorer Weekly") — copy its Audience ID.

Collecting subscribers needs only the API key + audience ID. **Sending** the
digest additionally requires a verified domain (next step).

### 2. Verify the sending domain (required before the first send)
1. Resend **Domains → Add Domain** → enter `usgridexplorer.com`.
2. Resend shows a few DNS records (SPF/DKIM, and a MX/return-path).
3. Add them where the domain's DNS lives. If the domain is on Vercel:
   **Vercel → Domains → usgridexplorer.com → DNS Records**.
4. Wait for Resend to show the domain as **Verified** (usually minutes).
5. Pick a from-address on that domain, e.g. `briefings@usgridexplorer.com`.

### 3. Environment variables

**Vercel** (Project → Settings → Environment Variables, all environments) — powers the on-site signup form:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key (`re_...`) |
| `RESEND_AUDIENCE_ID` | The audience ID |

**GitHub Actions** (Repo → Settings → Secrets and variables → Actions) — powers the weekly send:

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | Same Resend API key |
| `RESEND_AUDIENCE_ID` | Same audience ID |
| `RESEND_FROM` | `US Grid Explorer <briefings@usgridexplorer.com>` |
| `SUPABASE_URL` | (optional) pulls live articles; otherwise uses the static batch |
| `SUPABASE_ANON_KEY` | (optional) |

### 4. Test
- **Form:** open `/data-center-watch/`, Briefings tab, submit your email. It should
  appear under **Contacts** in the Resend audience.
- **Digest (no send):** `DIGEST_DRY_RUN=1 node scripts/send-weekly-digest.mjs` builds
  the email and prints the subject without sending. Add `DIGEST_OUT=preview.html` to
  write the rendered HTML to a file you can open in a browser.
- **Digest (live):** GitHub → Actions → **Send Weekly Digest → Run workflow**. Use the
  `dry_run` checkbox to rehearse first.

## Ongoing behavior
- Sends automatically **Thursdays at 14:00 UTC** (10:00 AM ET) — a strong B2B open window.
- Includes the week's top briefings by importance (`DIGEST_DAYS`, default 8-day window).
- Resend appends a compliant unsubscribe link automatically.
- Free tier caps at 100 emails/day — plenty until the list is large; upgrade when it isn't.

## Tuning knobs (env vars)
| Variable | Default | Meaning |
|---|---|---|
| `DIGEST_LIMIT` | `6` | Max stories per email |
| `DIGEST_DAYS` | `8` | Only include items newer than N days (`0` = no filter) |
| `SITE_URL` | `https://usgridexplorer.com` | Base URL for links |
| `DIGEST_DRY_RUN` | — | Build but don't send |
| `DIGEST_OUT` | — | Write rendered HTML to this path |

## Why weekly, not daily
Daily grid-news email drives fast unsubscribes and blows through the free 100/day
cap once the list grows. Weekly gets higher opens, higher click-through, and more
ad impressions per send. Change the cron in `.github/workflows/send-weekly-digest.yml`
if you ever want a different cadence.
