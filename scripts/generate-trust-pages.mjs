import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyticsEnabled, contactEmail, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl, trustRoutes } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const updatedAt = "June 20, 2026";

const pages = {
  about: {
    title: "About US Grid Explorer",
    eyebrow: "Mission and scope",
    lede: "US Grid Explorer makes American electricity infrastructure easier to find, understand, compare, and verify.",
    content: `<section><h2>Why this project exists</h2><p>Power plants, transmission networks, data centers, and regional demand are often published in separate systems. US Grid Explorer brings those public records into one visual research experience without hiding their different sources or limitations.</p><p>The project is designed for residents, students, educators, journalists, researchers, and professionals conducting preliminary infrastructure research.</p></section>
    <section><h2>What the project is not</h2><p>This is not a grid-operations system, outage authority, engineering model, investment service, or complete data-center inventory. Do not use it for emergency response, real-time dispatch, property decisions, or safety-critical work.</p></section>
    <section><h2>Product principles</h2><div class="trust-principles"><article><strong>Useful first</strong><p>Answer a real infrastructure question before adding spectacle.</p></article><article><strong>Sources visible</strong><p>Keep publishers, dates, and coverage warnings close to every claim.</p></article><article><strong>Uncertainty explicit</strong><p>Label preliminary, community-reported, and estimated information.</p></article><article><strong>Publicly understandable</strong><p>Explain technical grid concepts without pretending they are simple.</p></article></div></section>
    <section><h2>Current development status</h2><p>The project is actively developed. National map layers, state profiles, facility profiles, local infrastructure reports, and editorial guides are available now. The optional Grid Guide remains dependent on separately configured API access and is not required to use the site.</p></section>
    <section><h2>Contact</h2><p>Questions about the project, partnerships, accessibility, or general feedback can be sent to <a href="mailto:${contactEmail}">${contactEmail}</a>. Use the corrections page when reporting a specific data issue so the supporting evidence can remain reviewable.</p></section>`
  },
  methodology: {
    title: "Data Methodology",
    eyebrow: "How the numbers are built",
    lede: "Definitions, transformations, confidence labels, and known limits for every major US Grid Explorer view.",
    content: `<section><h2>Three measurements that must not be confused</h2><div class="definition-grid"><article><strong>Nameplate capacity</strong><p>The maximum rated output of generating equipment under specified conditions. Capacity does not describe how much electricity a plant actually produced.</p></article><article><strong>Electricity generation</strong><p>Energy produced over time, usually measured in megawatt-hours. Generation changes with dispatch, weather, fuel, maintenance, and market conditions.</p></article><article><strong>Electricity demand</strong><p>The rate at which customers consume electricity at a moment or during an interval. Regional demand is not the same as statewide capacity.</p></article></div></section>
    <section><h2>Confidence vocabulary</h2><dl class="trust-definitions"><div><dt>Final</dt><dd>Published as a finalized release by the source agency and used for aggregate state statistics.</dd></div><div><dt>Preliminary</dt><dd>An official early release that may be revised and is not used here for finalized state totals.</dd></div><div><dt>Reported</dt><dd>Published by an identified source, but fields may be incomplete, dated, or inferred.</dd></div><div><dt>Community-reported</dt><dd>Maintained by public contributors. Useful for discovery, but absence does not mean a facility does not exist.</dd></div><div><dt>Estimated</dt><dd>Derived or approximated rather than directly reported. Estimation should be explained near the value.</dd></div></dl></section>
    <section><h2>State profiles</h2><p>State operating capacity, proposed capacity, generator counts, and fuel mix use finalized EIA-860 2024 generator data. Fuel categories combine related EIA technologies into reader-friendly groups. Totals may differ slightly because displayed values are rounded.</p><p>Largest-plant tables use EIA-860 2025 Early Release records for facility discovery. Those preliminary records are kept separate from finalized statewide aggregation.</p></section>
    <section><h2>Map layers and local reports</h2><p>Power-plant markers use preliminary 2025 facility records. Transmission lines and substations are requested by the visible map extent; lower-voltage features appear as users zoom in. Visible-area counts are recalculated from point locations inside the current map bounds.</p><p>Local reports use straight-line distance from an approximate geocoded point. Nearby capacity does not establish which facilities serve a location. Transmission counts describe segments intersecting an approximate bounding area, not ownership or service territory.</p><p>Data centers use OpenStreetMap community records. Counts describe mapped locations only and must not be presented as complete market inventories.</p></section>
    <section><h2>Live grid signals</h2><p>Regional demand uses EIA-930 hourly operating data. Recent values can be preliminary, delayed, missing, or revised. A timestamp describes the observation or source refresh, not a guarantee of real-time grid conditions.</p></section>
    <section><h2>Quality process</h2><ol><li>Keep raw-source identity and source URLs in generated records.</li><li>Validate coordinates and required fields before publishing.</li><li>Separate finalized aggregation from preliminary facility discovery.</li><li>Regenerate static profiles after reviewed source updates.</li><li>Publish known limitations and accept documented corrections.</li></ol></section>`
  },
  sources: {
    title: "Data Sources",
    eyebrow: "Source registry",
    lede: "The public datasets, services, release statuses, and coverage limitations behind US Grid Explorer.",
    content: `<section><h2>Current source registry</h2><div class="source-table"><article><div><strong>EIA-860 2024 Final</strong><span class="status final">Final</span></div><p>State capacity, generator totals, proposed capacity, and fuel mix.</p><footer><span>U.S. Energy Information Administration</span><a href="https://www.eia.gov/electricity/data/eia860/">Open source</a></footer></article>
    <article><div><strong>EIA-860 2025 Early Release</strong><span class="status preliminary">Preliminary</span></div><p>Power-plant locations, technologies, operators, and facility-level capacity.</p><footer><span>U.S. Energy Information Administration</span><a href="https://www.eia.gov/electricity/data/eia860/">Open source</a></footer></article>
    <article><div><strong>EIA-930 Hourly Electric Grid Monitor</strong><span class="status reported">Hourly</span></div><p>Regional electricity demand and operating signals for supported balancing regions.</p><footer><span>U.S. Energy Information Administration</span><a href="https://www.eia.gov/opendata/">Open source</a></footer></article>
    <article><div><strong>OpenStreetMap</strong><span class="status community">Community-reported</span></div><p>Community-maintained data-center points and descriptive tags. Coverage is incomplete.</p><footer><span>OpenStreetMap contributors</span><a href="https://www.openstreetmap.org/">Open source</a></footer></article>
    <article><div><strong>Electric Power Transmission Lines</strong><span class="status reported">Reported</span></div><p>National transmission segments queried by visible map extent, including voltage and ownership where available.</p><footer><span>ArcGIS public infrastructure service</span><a href="https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0">Open service</a></footer></article>
    <article><div><strong>HIFLD Substations</strong><span class="status reported">Reported</span></div><p>Transmission-associated substations, primarily 69 kV and above. Lower-voltage coverage is incomplete.</p><footer><span>HIFLD and partner agencies</span><a href="https://www.arcgis.com/home/item.html?id=83397b209bfb4007a2f4c00e70df8e5d">Open source</a></footer></article>
    <article><div><strong>ArcGIS World Geocoding Service</strong><span class="status reported">Live service</span></div><p>City, ZIP, place, and address search results. Matches may be approximate.</p><footer><span>Esri</span><a href="https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer">Open service</a></footer></article></div></section>
    <section><h2>Basemap attribution</h2><p>Map tiles use CARTO styling with OpenStreetMap geographic data. Attribution remains visible in the map interface.</p></section>`
  },
  privacy: {
    title: "Privacy Notice",
    eyebrow: "User data and external services",
    lede: "A plain-language description of information processed when you use US Grid Explorer.",
    content: `<section><h2>Current collection</h2><p>US Grid Explorer does not currently provide user accounts, paid subscriptions, or persistent saved-location profiles. The application does not intentionally store precise residential addresses in its project datasets.</p><p>The hosting provider may process standard request information such as IP address, browser details, requested URLs, timestamps, and operational logs for security and delivery.</p></section>
    <section><h2>Location and search queries</h2><p>When you search for a city, ZIP code, place, or address, the query is sent to the ArcGIS World Geocoding Service to return matching coordinates. Do not enter private information that is unnecessary for a location search.</p></section>
    <section><h2>Optional Grid Guide</h2><p>If the Grid Guide is configured and you submit a question, the question and limited current-page context are sent through a server endpoint to the configured AI provider. The feature is optional and is not necessary for map, profile, directory, or comparison use.</p></section>
    <section><h2>Analytics and advertising</h2><p>${analyticsEnabled ? "Vercel Web Analytics is enabled to measure page visits and product usage. Analytics events are designed to exclude search text, exact addresses, and selected facility names. The site does not currently display third-party advertising." : "The site does not currently run third-party advertising or an enabled audience-analytics product. Analytics code remains disabled until the production setting is explicitly activated."} This notice will be reviewed before advertising or another analytics provider is enabled, including applicable consent or opt-out controls.</p></section>
    <section><h2>External links</h2><p>Source and policy links can take you to third-party websites with their own privacy practices. Review those services before submitting information.</p></section>
    <section><h2>Email and contact requests</h2><p>If you email <a href="mailto:${contactEmail}">${contactEmail}</a>, the message, sender address, and any information you include are processed so the request can be reviewed and answered. Do not send credentials, private infrastructure information, or other sensitive personal data.</p><p>Use the <a href="/corrections/">Corrections and contact page</a> to report a privacy concern or public data issue.</p></section>`
  },
  terms: {
    title: "Terms of Use",
    eyebrow: "Informational use",
    lede: "The boundaries for using US Grid Explorer and its public-source infrastructure information.",
    content: `<section><h2>Informational purpose</h2><p>US Grid Explorer is provided for general education, exploration, and preliminary research. It is not operational grid guidance, engineering advice, emergency information, legal advice, financial advice, or a substitute for verification with the responsible utility, regulator, agency, or property owner.</p></section>
    <section><h2>No completeness guarantee</h2><p>Public datasets can contain errors, omissions, delayed updates, inferred fields, and conflicting records. Community-maintained data can be especially incomplete. Features may change or become unavailable without notice.</p></section>
    <section><h2>Safety and infrastructure</h2><p>Do not use the site to enter restricted property, interfere with infrastructure, bypass security, or conduct unsafe activity. Map coordinates are not authorization for physical access.</p></section>
    <section><h2>Source rights and attribution</h2><p>Underlying records remain subject to their publishers' terms, licenses, attribution requirements, and public-domain status. US Grid Explorer's interface and transformed presentation do not remove those obligations.</p></section>
    <section><h2>Availability</h2><p>The site is provided without warranties of accuracy, availability, fitness, or uninterrupted operation to the extent permitted by applicable law. Verify consequential decisions with authoritative sources.</p></section>
    <section><h2>Contact and changes</h2><p>Questions about these terms can be sent to <a href="mailto:${contactEmail}">${contactEmail}</a>. These terms may be revised as accounts, analytics, advertising, APIs, or additional data products are introduced. Material changes will be reflected by the updated date on this page.</p></section>`
  },
  corrections: {
    title: "Corrections and Contact",
    eyebrow: "Improve the evidence",
    lede: "Report an incorrect record, missing context, source problem, privacy concern, or accessibility issue.",
    content: `<section><h2>Before submitting a correction</h2><p>Check the confidence label and source date. A preliminary or community-reported record may differ from a finalized agency publication. When possible, provide a public authoritative source supporting the correction.</p></section>
    <section><h2>What to include</h2><ul><li>The page URL or facility name</li><li>The field or statement that appears incorrect</li><li>The corrected value</li><li>A public source URL and publication date</li><li>Whether the issue involves privacy, accessibility, or data accuracy</li></ul></section>
    <section class="correction-action"><h2>Submit through GitHub</h2><p>Corrections are tracked publicly so the evidence and resulting change remain reviewable. Do not include private addresses, credentials, or sensitive personal information.</p><a class="primary-action" href="https://github.com/EIPJOS/us-grid-explorer/issues/new">Open a correction request</a></section>
    <section><h2>Private contact</h2><p>For accessibility, privacy, partnership, or other matters that should not be filed publicly, email <a href="mailto:${contactEmail}">${contactEmail}</a>. Include the relevant page URL when possible.</p></section>
    <section><h2>Review process</h2><ol><li>Confirm the report refers to a current published page.</li><li>Compare the claim with the cited authoritative source.</li><li>Update the transformation or source record rather than only changing displayed text.</li><li>Regenerate affected pages and document the correction in version history.</li></ol></section>`
  }
};

for (const route of trustRoutes) {
  const page = pages[route];
  if (!page) throw new Error(`Missing trust page content for ${route}`);
  const directory = path.join(publicDir, route);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderPage(route, page));
}

console.log(`Generated ${trustRoutes.length} trust and policy pages.`);

function renderPage(route, page) {
  const canonical = `${siteUrl}/${route}/`;
  const navigation = trustRoutes.map((item) => `<a${item === route ? ' class="active"' : ""} href="/${item}/">${label(item)}</a>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} | US Grid Explorer</title>
  <meta name="description" content="${escapeHtml(page.lede)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${escapeHtml(page.lede)}">
  <meta property="og:url" content="${canonical}">
  <link rel="stylesheet" href="/state-pages.css">
${renderAnalyticsScript()}
</head>
<body class="trust-page">
  ${renderSiteHeader("trust")}
  <main class="trust-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/methodology/">Trust center</a><span>/</span><b>${page.title}</b></nav>
    <header class="trust-hero"><p class="eyebrow">${page.eyebrow}</p><h1>${page.title}</h1><p>${page.lede}</p><span>Updated ${updatedAt}</span></header>
    <div class="trust-layout"><aside><strong>Trust center</strong><nav>${navigation}</nav><p>Questions about a record?</p><a href="/corrections/">Report a correction</a></aside><article class="trust-content">${page.content}</article></div>
  </main>
  ${renderSiteFooter(`Trust center updated ${updatedAt}`)}
</body>
</html>`;
}

function label(route) {
  return route === "corrections" ? "Corrections & contact" : route[0].toUpperCase() + route.slice(1);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
