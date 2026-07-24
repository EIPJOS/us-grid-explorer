import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contactEmail, permitAlertsRoutes, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "data-center-permits");

// Grid Permit Alerts: a companion B2B product (separate Supabase project + Resend
// audience from the main US Grid Explorer digest) that tracks county-level data
// center permit filings and hearing calendars. Loudoun, VA is the only ACTIVE region
// right now -- Fort Worth, Irving, Atlanta, and Prince William have working, validated
// scrapers (grid-permit-alerts repo) but are PAUSED as of 2026-07-24 per a new gate:
// no new region runs until the current one has real paying subscribers, since
// Anthropic classification cost scales with region count, not subscriber count. Their
// `status` below is temporarily "coming_soon" to match -- flip back to "live" only
// alongside re-enabling them in scraper/run.py's COUNTY_RUNNERS. Phoenix/Chicago were
// never built; they're genuine waitlist-only entries.
const regions = {
  "loudoun-va": {
    name: "Loudoun County, Virginia",
    short: "Loudoun County, VA",
    market: 'Northern Virginia — the original "Data Center Alley"',
    accent: "#dfff3f",
    status: "live",
    paidTierAvailable: true,
    dek: "Every legislative land-use filing tied to data center development in Loudoun County — rezonings, special exceptions, substations, energy storage — summarized in plain English, grouped by hearing date, and linked straight back to the source record.",
    stats: [
      { label: "Of county commercial tax base", value: "~73%", note: "is data centers (Tax Year 2025)" },
      { label: "Computer equipment tax revenue", value: "$684.8M", note: "FY2026 proposed budget, +17.8% vs. 2023" },
      { label: "By-right development", value: "Ended", note: "March 2025 — every new filing now needs Board approval" }
    ],
    body: `<section><h2>Why this matters more than it used to</h2><p>Loudoun County ended by-right data center development in March 2025. Every new data center application — every rezoning, every special exception, every substation — now requires discretionary legislative approval from the Planning Commission and Board of Supervisors. That means there is a real, trackable public record for every project before it breaks ground, and a real hearing calendar attached to it.</p></section>
    <section><h2>What the alert covers</h2><ul><li>Every Legislative Land Development Application filed through the county's LandMARC (Tyler EnerGov) permitting system, scraped daily</li><li>Planning Commission and Board of Supervisors hearing dates, pulled from the county's own hearing calendar</li><li>A plain-English summary and a one-line "why it matters" for every relevant filing — not a raw government form</li><li>A direct link to the source record on every item, so anything can be independently verified</li></ul></section>
    <section><h2>What's coming</h2><p>Phase 2 (in progress at the county) will add new noise, height, generator, and setback standards for data centers, expected to reach adoption by the end of 2026 — subscribers get that regulatory context alongside the filing tracker, not as a separate research project.</p></section>`,
    sourceNote: "Loudoun County LandMARC (Tyler EnerGov Self-Service) permitting system and the county's Planning Commission / Board of Supervisors hearing calendar (Laserfiche WebLink). Both are public county systems; every alert links back to the original record."
  },
  "fort-worth-tx": {
    name: "Fort Worth, Texas",
    short: "Fort Worth, TX",
    market: "4 operational data centers, 5 more planned or under construction",
    accent: "#7d9fff",
    status: "coming_soon", // paused 2026-07-24 (SPEC.md gate) -- scraper built, not currently running
    dek: "A live, contested data-center zoning fight — the city's own proposed rules were sent back to Council for a vote — tracked from the same public rezoning-case record as everything else in the county's own system.",
    stats: [
      { label: "Data centers in the city", value: "4 live", note: "plus 5 more planned or under construction" },
      { label: "Largest single rezoning tracked", value: "450+ ac", note: "agricultural to light-industrial, Far South sector" },
      { label: "Zoning Commission vote", value: "7-4 denial", note: "sent back to City Council for an Aug 11, 2026 vote" }
    ],
    body: `<section><h2>Why this matters more than it used to</h2><p>Fort Worth is one of the few cities in the country actively writing a data-center-specific zoning ordinance right now — the Zoning Commission voted 7-4 against the city's own proposed rules (setback distances, which industrial zones qualify) and sent it to City Council, with a vote scheduled for August 11, 2026. That means every rezoning case tied to a data center campus, and the policy fight shaping how the next ones get approved, has a real public record attached to it before ground breaks.</p></section>
    <section><h2>What the alert covers</h2><ul><li>Every case in the city's public Zoning Cases record with data-center-relevant language in the rezoning description — new campuses, planned-development amendments adding substations or data center use, and related site plans</li><li>A plain-English summary and a one-line "why it matters" for every relevant filing — not a raw zoning-code dump</li><li>A direct link back to the source record on every item, so anything can be independently verified</li></ul></section>`,
    sourceNote: "City of Fort Worth's public Zoning Cases record (ArcGIS-based, city-wide), covering current and recently-decided rezoning cases. Every alert links back to the original record."
  },
  "irving-tx": {
    name: "Irving, Texas",
    short: "Irving, TX",
    market: "Microsoft alone is reportedly building 4 of 7 planned data centers here",
    accent: "#7d9fff",
    status: "coming_soon", // paused 2026-07-24 (SPEC.md gate) -- scraper built, not currently running
    dek: "Tracks large industrial and technology-park rezonings in one of DFW's most active data-center corridors, cross-referenced against known data-center developers and site size.",
    stats: [
      { label: "Microsoft data centers reported here", value: "4 of 7", note: "planned across the DFW market" },
      { label: "Largest tracked rezoning", value: "24.5 ac", note: "light-industrial parcel, denied then approved on resubmission" },
      { label: "Hearing stages tracked", value: "2", note: "Planning & Zoning Commission, then City Council" }
    ],
    body: `<section><h2>Why this matters more than it used to</h2><p>Irving sits inside one of the busiest stretches of the DFW data-center corridor, with Microsoft alone reported to be building several campuses in the area. Unlike some neighboring cities, Irving's own public rezoning records don't spell out project descriptions in plain language — so this tracker flags large industrial-zoned rezonings and known data-center-developer names directly, and every flagged filing still gets a plain-English AI summary and relevance check before it reaches the digest.</p></section>
    <section><h2>What the alert covers</h2><ul><li>Rezoning cases tied to known data-center developers and operators active in the market</li><li>Large-parcel light-industrial rezonings, the zoning pattern data center campuses typically use</li><li>Both hearing stages — Planning & Zoning Commission recommendation, then City Council's final vote — with dates for each</li><li>A direct link back to the source record on every item</li></ul></section>`,
    sourceNote: "City of Irving's public zoning-case record (ArcGIS-based). Because Irving's own system doesn't publish project descriptions, coverage here leans on parcel size, zoning type, and developer/owner name — broader zoning activity may exist beyond what's flagged. Every alert links back to the original record for independent verification."
  },
  "phoenix-az": {
    name: "Phoenix, Arizona",
    short: "Phoenix, AZ",
    market: "100+ facilities on cheap, reliable power",
    accent: "#ffb77a",
    status: "coming_soon",
    dek: "Low-cost power and land have made metro Phoenix one of the largest data center markets in the country.",
  },
  "chicago-il": {
    name: "Chicago, Illinois",
    short: "Chicago, IL",
    market: "~130 facilities, ~1,120 MW of commissioned capacity",
    accent: "#d0a8ff",
    status: "coming_soon",
    dek: "A long-established Midwest hub with dense multi-tenant data center capacity and active permitting.",
  },
  "atlanta-ga": {
    name: "Atlanta, Georgia",
    short: "Atlanta, GA",
    market: "Now the 4th-largest U.S. data center market",
    accent: "#75eab0",
    status: "coming_soon", // paused 2026-07-24 (SPEC.md gate) -- scraper built, not currently running
    dek: "Atlanta is actively rewriting its own data-center rules — a Special Use Permit requirement, a transit-proximity ban, a Beltline ban — tracked straight from the city's own rezoning-case record.",
    stats: [
      { label: "U.S. data center market rank", value: "#4", note: "80+ facilities and growing, Southeast hyperscale demand" },
      { label: "New rule (2025)", value: "SUP required", note: "data centers now need a Special Use Permit citywide" },
      { label: "Transit-proximity ban", value: "2,640 ft", note: "data centers barred within this distance of high-capacity transit (2024)" }
    ],
    body: `<section><h2>Why this matters more than it used to</h2><p>Atlanta has spent the last two years actively rewriting how — and where — data centers can be built: a 2024 ban within 2,640 feet of high-capacity transit stops, a Beltline Overlay District ban, and a 2025 ordinance requiring a Special Use Permit for any new data center citywide. In December 2024, Mayor Andre Dickens personally intervened to help kill a proposed data center near the West End MARTA station. This is a live, contested policy fight, not a settled process — every rezoning case tied to it has a real public record.</p></section>
    <section><h2>What the alert covers</h2><ul><li>Rezoning cases from the city's public record with data-center-relevant language, extracted directly from the adopted ordinance text</li><li>Full multi-stage hearing history — Zoning Committee recommendation, then City Council's final vote — with dates for each stage</li><li>A plain-English summary and a one-line "why it matters" for every relevant filing</li><li>A direct link back to the source ordinance on every item, so anything can be independently verified</li></ul></section>`,
    sourceNote: "City of Atlanta's public Rezoning Cases record (ArcGIS-based) and the linked adopted-ordinance documents. Every alert links back to the original ordinance for independent verification."
  },
  "prince-william-va": {
    name: "Prince William County, Virginia",
    short: "Prince William County, VA",
    market: "Home to Digital Gateway — one of the most litigated data center fights in the country",
    accent: "#dfff3f",
    status: "coming_soon", // paused 2026-07-24 (SPEC.md gate) -- scraper built, not currently running
    dek: "Tracked from the same county land-use system as Loudoun — including the Digital Gateway rezoning, a 2,000-acre campus whose approval was overturned in court and is now under appeal.",
    stats: [
      { label: "Digital Gateway campus", value: "~2,000 ac", note: "up to 37 data center buildings near Manassas National Battlefield" },
      { label: "Rezoning status", value: "Overturned", note: "a circuit court judge voided the 2023 approval; under appeal" },
      { label: "Zoning Overlay updates", value: "2 tracked", note: "text amendments to the county's Data Center Opportunity Zone Overlay" }
    ],
    body: `<section><h2>Why this matters more than it used to</h2><p>Prince William County is home to Digital Gateway, a roughly 2,000-acre, up to 37-building data center campus near Manassas National Battlefield Park — one of the most litigated data-center zoning fights in the country. A circuit court judge overturned the county's 2023 rezoning approval, and the Board of County Supervisors is appealing. Alongside it, the county keeps revising its own Data Center Opportunity Zone Overlay District rules — this is a live, contested process, not a settled one.</p></section>
    <section><h2>What the alert covers</h2><ul><li>Rezoning and land development cases from the county's public land-use record — including named projects like Digital Gateway, Gainesville Crossing, and others</li><li>Zoning text amendments affecting the Data Center Opportunity Zone Overlay District</li><li>A plain-English summary and a one-line "why it matters" for every relevant filing</li><li>A direct link to the source record on every item, so anything can be independently verified</li></ul></section>`,
    sourceNote: "Prince William County's public land-use case management system (Tyler EnerGov, the same platform family as Loudoun County's). Every alert links back to the original record."
  }
};

for (const route of permitAlertsRoutes) if (!regions[route]) throw new Error(`Missing permit-alerts region definition: ${route}`);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), renderHub());
for (const route of permitAlertsRoutes) {
  const directory = path.join(outputDir, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderRegion(route, regions[route]));
}
console.log(`Generated ${permitAlertsRoutes.length + 1} data-center permit-alert pages.`);

function renderHub() {
  const cards = permitAlertsRoutes.map((route) => {
    const region = regions[route];
    const soon = region.status === "coming_soon";
    return `<a class="region-card${soon ? " permit-card-soon" : ""}" style="--region:${region.accent}" href="/data-center-permits/${route}/">
      <span>${soon ? "Coming soon" : "Live now"} &middot; Permit tracker</span>
      <h2>${region.short}</h2>
      <p>${region.dek}</p>
      <dl><dt>Market</dt><dd>${region.market}</dd><dt>Status</dt><dd>${soon ? "Join the waitlist" : "Weekly digest active"}</dd></dl>
      <b>${soon ? "Get notified when it launches" : "See what it tracks"} &rarr;</b>
    </a>`;
  }).join("");
  return shell({
    title: "Data Center Permit Alerts by Region",
    description: "Weekly, plain-English alerts on data center permit filings and hearing calendars in the country's busiest data center markets — starting with Loudoun County, VA.",
    canonical: `${siteUrl}/data-center-permits/`,
    body: `<main class="region-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>Permit Alerts</b></nav>
    <header class="region-hero"><p class="eyebrow">Grid Permit Alerts &middot; County-level filing tracker</p><h1>Data center permit filings, tracked by region</h1><p>A weekly digest of every land-use filing tied to data center development in the country's busiest markets — rezonings, special exceptions, substations, and the hearing dates attached to them. Loudoun County, VA is live now; more markets are next.</p></header>
    <section class="region-directory">${cards}</section>
    <section class="region-boundary-note"><div><p class="eyebrow">How this works</p><h2>Built from the county's own public record</h2></div><p>Every alert is generated from official county permitting systems and hearing calendars, not third-party estimates — and every item links back to the source filing so it can be independently verified.</p><a href="/data-center-permits/loudoun-va/">See the Loudoun County tracker &rarr;</a></section>
    </main>`
  });
}

function renderRegion(route, region) {
  const canonical = `${siteUrl}/data-center-permits/${route}/`;
  const isLive = region.status === "live";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Data center permit alerts — ${region.short}`,
    description: region.dek,
    url: canonical,
    areaServed: region.name,
    provider: { "@type": "Organization", name: "US Grid Explorer / Grid Permit Alerts" }
  };
  const body = isLive
    ? `<main class="region-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/data-center-permits/">Permit Alerts</a><span>/</span><b>${region.short}</b></nav>
    <header class="region-profile-hero"><div><p class="eyebrow">Data Center Permit Alerts &middot; ${region.market}</p><h1>${region.name}</h1><p>${region.dek}</p></div><aside><span>Coverage</span><strong>Live now</strong><small>Daily scrape, weekly digest</small></aside></header>
    <section class="metrics">${region.stats.map((stat) => `<article><span>${stat.label}</span><strong>${stat.value}</strong><small>${stat.note}</small></article>`).join("")}</section>
    ${permitSignup(region, route)}
    <div class="trust-content">${region.body}</div>
    <section class="region-sources"><div><p class="eyebrow">Sources</p><h2>Where this comes from</h2></div><p>${region.sourceNote}</p></section>
    ${relatedRegions(route)}
    </main>`
    : `<main class="region-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/data-center-permits/">Permit Alerts</a><span>/</span><b>${region.short}</b></nav>
    <header class="region-profile-hero"><div><p class="eyebrow">Data Center Permit Alerts &middot; ${region.market}</p><h1>${region.name}</h1><p>${region.dek}</p><p>This market's permit tracker isn't built yet — join the waitlist and we'll email you when it launches. Signing up also helps decide which market gets built next.</p></div><aside><span>Status</span><strong>Coming soon</strong><small>Demand-validated before we build it</small></aside></header>
    ${permitSignup(region, route)}
    ${relatedRegions(route)}
    </main>`;
  return shell({ title: `${region.short} Data Center Permit Alerts`, description: region.dek, canonical, schema, region, body });
}

function permitSignup(region, route) {
  const isLive = region.status === "live";
  // Paid checkout needs a Stripe price configured per region (see
  // api/create-checkout-session.js's COUNTY_PRICE_IDS) -- only Loudoun has one
  // today, so a region being "live" for the free weekly digest doesn't imply
  // the $49/mo tier is ready. Showing that CTA without a real price behind it
  // would just send subscribers into a "This market isn't available for paid
  // alerts yet" error.
  const paidBlock = isLive && region.paidTierAvailable
    ? `<div class="permit-paid-cta" data-county="${route}">
        <div>
          <p class="eyebrow">$49/mo</p>
          <h3>Same-day alerts + hearing calendar</h3>
          <p>Skip the 1-week delay. Get relevant filings the day they're scraped, plus Planning Commission and Board of Supervisors hearing dates. Cancel anytime.</p>
        </div>
        <button type="button" class="permit-paid-button" data-email-target="paid-email-${route}">Subscribe — $49/mo</button>
        <input type="email" id="paid-email-${route}" class="permit-paid-email" inputmode="email" autocomplete="email" placeholder="you@company.com" aria-label="Email address for paid subscription">
        <p class="permit-msg permit-paid-msg" role="status"></p>
      </div>`
    : "";
  return `<section class="permit-signup-row">
    <section class="permit-signup" data-region="${region.short}">
      <div>
        <p class="eyebrow">Free${isLive ? ", 1-week delay" : " during beta"}</p>
        <h2>${isLive ? `Get the weekly ${region.short} digest` : `Get notified when ${region.short} launches`}</h2>
        <p>One email a week. No spam, unsubscribe anytime.</p>
      </div>
      <form class="permit-signup-form" onsubmit="return false;">
        <label class="permit-hp" aria-hidden="true">Company<input type="text" name="company" tabindex="-1" autocomplete="off"></label>
        <input type="email" name="email" inputmode="email" autocomplete="email" placeholder="you@company.com" aria-label="Email address" required>
        <button type="submit">${isLive ? "Get the free digest" : "Join the waitlist"}</button>
      </form>
      <p class="permit-msg" role="status"></p>
    </section>
    ${paidBlock}
  </section>
  ${isLive && region.paidTierAvailable ? `<p class="permit-manage-link">Already a paid subscriber? <a href="#" data-manage-billing>Manage your subscription</a></p>` : ""}
  <script>(()=>{
    const sections=document.querySelectorAll('.permit-signup');
    sections.forEach(section=>{
      const form=section.querySelector('form');
      const msg=section.querySelector('.permit-msg');
      const button=form.querySelector('button');
      form.addEventListener('submit',async(event)=>{
        event.preventDefault();
        const email=form.email.value.trim();
        const company=form.company.value.trim();
        if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){msg.textContent='Please enter a valid email address.';msg.className='permit-msg error';return}
        button.disabled=true;const original=button.textContent;button.textContent='Joining...';msg.textContent='';msg.className='permit-msg';
        try{
          const response=await fetch('/api/subscribe-permit-alerts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,company,region:section.dataset.region})});
          const payload=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(payload.message||'Something went wrong. Please try again.');
          msg.textContent=payload.message||"You're in.";msg.className='permit-msg success';form.reset();button.textContent='Done';
        }catch(error){
          msg.textContent=error instanceof Error?error.message:'Something went wrong. Please try again.';msg.className='permit-msg error';button.disabled=false;button.textContent=original;
        }
      });
    });
    document.querySelectorAll('.permit-paid-cta').forEach(cta=>{
      const county=cta.dataset.county;
      const button=cta.querySelector('.permit-paid-button');
      const emailInput=cta.querySelector('.permit-paid-email');
      const msg=cta.querySelector('.permit-paid-msg');
      button.addEventListener('click',async()=>{
        const email=emailInput.value.trim();
        if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){msg.textContent='Please enter a valid email address.';msg.className='permit-msg permit-paid-msg error';return}
        button.disabled=true;const original=button.textContent;button.textContent='Redirecting to checkout...';msg.textContent='';msg.className='permit-msg permit-paid-msg';
        try{
          const response=await fetch('/api/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,county})});
          const payload=await response.json().catch(()=>({}));
          if(!response.ok||!payload.url)throw new Error(payload.message||'Could not start checkout. Please try again.');
          window.location.href=payload.url;
        }catch(error){
          msg.textContent=error instanceof Error?error.message:'Could not start checkout. Please try again.';msg.className='permit-msg permit-paid-msg error';button.disabled=false;button.textContent=original;
        }
      });
    });
    document.querySelectorAll('[data-manage-billing]').forEach(link=>{
      link.addEventListener('click',async(event)=>{
        event.preventDefault();
        const email=window.prompt('Enter the email address on your paid subscription:');
        if(!email)return;
        try{
          const response=await fetch('/api/create-portal-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim()})});
          const payload=await response.json().catch(()=>({}));
          if(!response.ok||!payload.url){window.alert(payload.message||"Couldn't find an active paid subscription for that email.");return}
          window.location.href=payload.url;
        }catch(error){window.alert('Could not reach the billing service. Please try again.');}
      });
    });
    const checkoutState=new URLSearchParams(window.location.search).get('checkout');
    if(checkoutState==='success'){
      const banner=document.createElement('p');
      banner.className='permit-checkout-banner success';
      banner.textContent="You're subscribed! Same-day alerts start with the next filing.";
      document.querySelector('main')?.prepend(banner);
    }else if(checkoutState==='cancelled'){
      const banner=document.createElement('p');
      banner.className='permit-checkout-banner';
      banner.textContent='Checkout cancelled — no charge was made.';
      document.querySelector('main')?.prepend(banner);
    }
  })();</script>`;
}

function relatedRegions(current) {
  const others = permitAlertsRoutes.filter((route) => route !== current).slice(0, 3);
  return `<section class="profile-links region-related"><div><p class="eyebrow">More markets</p><h2>See another region</h2><a class="all-states-link" href="/data-center-permits/">All permit alerts &rarr;</a></div>${others.map((route) => `<a style="border-top:2px solid var(--line)" href="/data-center-permits/${route}/"><span>Permit alerts</span><strong>${regions[route].short}</strong></a>`).join("")}</section>`;
}

function shell({ title, description, canonical, body, schema, region }) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | US Grid Explorer</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/state-pages.css">${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}${renderAnalyticsScript()}</head><body class="region-page"${region ? ` style="--region:${region.accent}"` : ""}>${renderSiteHeader("permits")}${body}${renderSiteFooter("County-level data center permit tracking, built from official public records")}</body></html>`;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
