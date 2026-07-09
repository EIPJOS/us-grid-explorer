# Grid Permit Alerts — Stripe Payment Setup

Pages: `/data-center-permits/loudoun-va/` (the only market with a real paid
tier right now — see `scripts/generate-permit-alerts-pages.mjs`'s `regions`
map, `status: "live"`). The other four regions stay free-waitlist-only until
their scrapers exist (grid-permit-alerts SPEC.md section 7).

This follows the same "plain fetch, no vendor SDK" pattern as
`api/subscribe-permit-alerts.js` and `api/watch-articles.js` — there is no
`stripe` npm dependency. All three new endpoints call Stripe's REST API
directly and verify webhook signatures by hand with Node's built-in `crypto`.

## What this adds

- **`api/create-checkout-session.js`** — starts a Stripe Checkout session for
  the $49/mo Loudoun price when someone clicks "Subscribe — $49/mo" on the
  live region page.
- **`api/stripe-webhook.js`** — the only place a subscriber's `tier` flips to
  `'paid'` in Supabase. Listens for `checkout.session.completed` (upgrade) and
  `customer.subscription.deleted` (downgrade back to `'free'` — never
  deletes the row, so they keep getting the free weekly digest).
- **`api/create-portal-session.js`** — lets an existing paid subscriber open
  Stripe's hosted billing portal to update their card or cancel, via the
  "Manage your subscription" link on the region page.
- `pipeline/digest.py` in the **grid-permit-alerts** repo needs **no changes**
  — it already reads whatever `tier` is sitting in the `subscribers` row.
  Stripe writes to that row; digest.py just reads it.

## One-time setup (you do this — I can't create accounts or enter API keys)

### 1. Create the Stripe product and price
In the [Stripe Dashboard](https://dashboard.stripe.com) → **Product catalog** → **Add product**:
- Name: `Grid Permit Alerts — Loudoun County, VA`
- Pricing: **Recurring**, `$49.00 USD`, **Monthly**
- Save, then open the price you just created and copy its **Price ID**
  (starts with `price_...`).

Do this once in **Test mode** first to try the whole flow safely (Stripe's
test mode uses fake cards, e.g. `4242 4242 4242 4242`, any future expiry, any
CVC), then repeat in **Live mode** when you're ready to accept real payments.
Test mode and live mode have separate API keys and price IDs — keep track of
which is which.

### 2. Register the webhook endpoint
Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**:
- Endpoint URL: `https://usgridexplorer.com/api/stripe-webhook`
- Events to send: `checkout.session.completed` and `customer.subscription.deleted`
- Save, then open the endpoint and copy its **Signing secret** (starts with `whsec_...`).

### 3. Add environment variables in Vercel
Project → **Settings** → **Environment Variables**. Add these (use the Test
mode values first while you're trying it out, then swap to Live mode values
before announcing it publicly):

| Variable | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | From Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From step 2 above |
| `STRIPE_PRICE_ID_LOUDOUN_VA` | `price_...` | From step 1 above |
| `SUPABASE_SERVICE_KEY` | service-role key | **New** — separate from `SUPABASE_ANON_KEY`, which `api/watch-articles.js` already uses. Get it from Supabase Dashboard → Project Settings → API → `service_role` key (the "secret" one, not the public/anon one). Needed because the `subscribers` table's Row Level Security correctly blocks the public anon key from writing to it. |

`SUPABASE_URL` should already be set (it's used by `api/watch-articles.js`)
— confirm it points at the same Supabase project the `grid-permit-alerts`
Python pipeline uses, since that's where the `subscribers` table lives.

Redeploy after adding these — Vercel env var changes don't apply to
already-running deployments.

### 4. Test the whole flow (test mode)
1. Open `/data-center-permits/loudoun-va/`, enter an email in the "$49/mo"
   box, click **Subscribe**.
2. You should land on Stripe's hosted checkout. Pay with the test card
   `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC, any ZIP.
3. You should be redirected back to `/data-center-permits/loudoun-va/?checkout=success`
   with a confirmation banner.
4. Check Supabase → Table Editor → `subscribers`: the row for that email
   should now show `tier = paid` and a `stripe_customer_id`.
5. Check Stripe Dashboard → Developers → Webhooks → your endpoint → recent
   deliveries: you should see a `200` response for `checkout.session.completed`.
6. To test cancellation: in Stripe Dashboard, cancel that test subscription.
   Within a few seconds, the Supabase row should flip back to `tier = free`
   (check the webhook's `customer.subscription.deleted` delivery).
7. Test **Manage your subscription** on the same page — it should prompt for
   an email, then redirect to Stripe's billing portal for that customer.

### 5. Go live
Once test mode works end-to-end: repeat step 1 in Live mode (new product,
same $49/mo price), repeat step 2 with a Live mode webhook endpoint, then
swap all four Vercel env vars above to their Live mode equivalents and
redeploy. Real cards will now be charged.

## Adding a paid tier to a new region later
1. Create a new Stripe price for that region (step 1 above).
2. Add a new Vercel env var, e.g. `STRIPE_PRICE_ID_PHOENIX_AZ`.
3. In `api/create-checkout-session.js`, add an entry to `COUNTY_PRICE_IDS`
   mapping the region's route slug to that new env var name.
4. Flip the region's `status` to `"live"` in
   `scripts/generate-permit-alerts-pages.mjs` and add `stats`, `body`, and
   `sourceNote` (see the Loudoun entry) — this automatically makes the paid
   CTA appear on that region's page too, since `permitSignup()` renders it
   for any `status: "live"` region.

## Notes on scope and safety
- No card data ever touches this codebase or Vercel — Stripe Checkout and
  the Billing Portal are both fully hosted by Stripe.
- The webhook signature is verified manually (Stripe's documented HMAC-SHA256
  scheme) before any event is trusted, and timestamps older than 5 minutes
  are rejected as a replay-attack guard.
- `checkout.session.completed` **upserts** on the unique `email` column, so a
  returning free subscriber who pays doesn't get a duplicate row — they just
  get upgraded in place.
