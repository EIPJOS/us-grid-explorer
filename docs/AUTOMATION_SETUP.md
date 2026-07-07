# Daily Article Automation — Setup Guide

Fully automated pipeline: **3 research articles every business day**, written by Claude, stored in Supabase, rendered on `/data-center-watch`.

```
GitHub Actions (Mon-Fri, ~6:30 AM ET)
  └─ scripts/publish-daily-articles.mjs
       1. Scan RSS feeds (EIA, Utility Dive, DCD, DCK, POWER Mag, arXiv, ...)
       2. Score + dedupe with the existing content pipeline
       3. Skip URLs already published (Supabase check)
       4. Pick top 3 (Tier 1 > 2 > 3, one story per topic cluster)
       5. Fetch each article page for extra context
       6. Claude writes original summary + "why it matters" + tags + score
       7. Insert into Supabase (status = published)

Website (Vercel)
  └─ /api/watch-articles  → reads Supabase (anon key, read-only RLS)
       └─ DataCenterWatchView "Briefings" tab renders the articles
          (static daily-feed-batch.json remains as fallback)
```

## One-time setup (15 minutes)

### 1. Supabase (5 min)
1. Create a free project at supabase.com.
2. Open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
3. Go to **Project Settings → API** and copy three values:
   - Project URL (e.g. `https://abcd1234.supabase.co`)
   - `anon` public key
   - `service_role` key (keep secret — it bypasses RLS)

### 2. GitHub repository secrets (3 min)
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (console.anthropic.com) |
| `SUPABASE_URL` | The Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | The `service_role` key |

### 3. Vercel environment variables (3 min)
Vercel project → **Settings → Environment Variables** (all environments):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | The Project URL |
| `SUPABASE_ANON_KEY` | The `anon` public key |

Then redeploy (or just push this branch — Vercel redeploys automatically).

### 4. First run (2 min)
GitHub → **Actions → Publish Daily Articles → Run workflow**.
Watch the logs: you'll see each source scanned, the 3 selected items, and the Supabase insert count.
Then open `https://usgridexplorer.com/data-center-watch/` — the new cards appear at the top of the **Briefings** tab.

## Ongoing behavior
- Runs automatically **Mon–Fri at 10:30 UTC** (6:30 AM EDT / 5:30 AM EST).
- Never publishes the same URL twice (checked against the last 1,000 rows).
- A failed source feed is logged and skipped — it never breaks the run.
- If zero new qualifying stories exist, the run exits cleanly and publishes nothing.
- The API response is CDN-cached for 15 minutes (`s-maxage=900`).

## Tuning knobs (env vars in the workflow file)
| Variable | Default | Meaning |
|---|---|---|
| `ARTICLE_MODEL` | `claude-sonnet-5` | Anthropic model for summaries |
| `ARTICLE_LIMIT` | `3` | Articles per run |
| `ARTICLE_MIN_SCORE` | `55` | Minimum relevance score to qualify |

## Managing articles
- **Unpublish** an article: in Supabase Table Editor set its `status` to `retracted` — it disappears from the site within 15 minutes.
- **Add/remove feeds**: edit the `rssSources` array at the top of `scripts/publish-daily-articles.mjs`. Bad URLs fail gracefully, so it is safe to experiment.
- **Costs**: 3 articles/day ≈ ~15k input + 1k output tokens per day on Sonnet — a few cents per day.

## Notes
- The old `daily-feed-batch.yml` (review-first PR workflow) still exists. You can keep it, or disable it in the Actions tab now that publishing is fully automated.
- Summaries are original paraphrased editorial content with attribution and a "Read original" link — the standard news-briefing format.
