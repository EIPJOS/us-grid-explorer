# Search and analytics setup

The codebase is instrumented, but data collection is disabled by default.

## Vercel Web Analytics

1. Open the Vercel project.
2. Select Analytics and enable Web Analytics.
3. Add `VITE_ANALYTICS_ENABLED=true` to Production and Preview environment variables.
4. Redeploy the project.
5. Confirm page views appear in the Vercel dashboard.

The application never includes raw search text, exact addresses, or facility names in custom event properties. Vercel custom-event reporting is currently limited to Pro and Enterprise plans; the Hobby plan can still use the page-view foundation where available.

## Google Search Console

Prefer a Domain property after a custom domain is connected. Domain verification uses a DNS record and does not require an application environment variable.

For a URL-prefix property using HTML-tag verification:

1. Copy only the verification token from Google Search Console.
2. Add it as `VITE_GOOGLE_SITE_VERIFICATION` in Vercel.
3. Redeploy and verify that the meta tag appears on the home page.
4. Complete verification in Search Console.
5. Submit `https://YOUR_DOMAIN/sitemap.xml`.

Do not commit a private DNS-provider credential or account access token. The Search Console verification token is intended to be published in page markup, but using an environment variable keeps domain changes simple.

## Event vocabulary

- `View Changed`
- `Facility Search Selected`
- `Place Search Submitted`
- `Place Search Completed`
- `Place Selected`
- `Map Feature Selected`
- `Layer Toggled`
- `Fuel Filter Changed`
- `State Comparison Updated`
- `Map Tour Started`
- `Source Opened`
- `Area Report Generated`
- `Area Radius Changed`
- `Area Report Shared`
- `Area Opened On Map`

Event properties are allowlisted and sanitized in `src/lib/analytics.js`.
