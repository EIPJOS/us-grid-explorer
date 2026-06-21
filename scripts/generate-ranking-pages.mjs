import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankingRoutes, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "rankings");
const payload = JSON.parse(await readFile(path.join(root, "public", "data", "state-analysis.json"), "utf8"));
const renewableFuels = ["solar", "wind", "hydro", "geothermal", "biomass"];
const stateNames = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"Washington, D.C."
};
const states = payload.states.map((state) => ({ ...state, name: stateNames[state.state], slug: slugify(stateNames[state.state]) }));

const rankings = {
  "operating-capacity": ranking({
    title: "States Ranked by Power Capacity",
    shortTitle: "Operating capacity",
    description: "Compare total operating power-plant nameplate capacity across all 50 states and Washington, D.C., using finalized EIA-860 data.",
    question: "Which states have the most operating power capacity?",
    value: (state) => state.operatingCapacityMw,
    format: formatMw,
    context: (state) => `${state.plantCount.toLocaleString()} plants`,
    explanation: "Operating nameplate capacity measures the rated capability of installed generating equipment. It does not measure electricity generated, demand, imports, exports, or reliability.",
    include: () => true
  }),
  "renewable-share": ranking({
    title: "States Ranked by Renewable Capacity Share",
    shortTitle: "Renewable share",
    description: "Compare the share of state operating capacity reported as solar, wind, hydro, geothermal, or biomass in finalized EIA-860 data.",
    question: "Which state portfolios have the highest renewable share?",
    value: (state) => percent(renewableCapacity(state), state.operatingCapacityMw),
    rawValue: renewableCapacity,
    format: (value) => `${value.toFixed(1)}%`,
    context: (state) => `${formatMw(renewableCapacity(state))} renewable`,
    explanation: "Renewable share divides selected renewable nameplate capacity by total state nameplate capacity. Storage is excluded because it shifts electricity rather than identifying the original energy source.",
    include: () => true
  }),
  "nuclear-capacity": ranking({
    title: "States Ranked by Nuclear Power Capacity",
    shortTitle: "Nuclear capacity",
    description: "Compare operating nuclear nameplate capacity by state using finalized EIA-860 generator records.",
    question: "Which states report the most nuclear capacity?",
    value: (state) => state.capacityByFuelMw.nuclear ?? 0,
    format: formatMw,
    context: (state) => `${percent(state.capacityByFuelMw.nuclear ?? 0, state.operatingCapacityMw).toFixed(1)}% of state capacity`,
    explanation: "This ranking measures reported nuclear nameplate capacity, not annual nuclear generation. States with no operating nuclear capacity are omitted from the ranked table.",
    include: (state) => (state.capacityByFuelMw.nuclear ?? 0) > 0
  }),
  "proposed-capacity": ranking({
    title: "States Ranked by Proposed Power Capacity",
    shortTitle: "Proposed capacity",
    description: "Compare reported proposed power-generation capacity and generator counts across US states.",
    question: "Where is the largest proposed generation pipeline?",
    value: (state) => state.proposedCapacityMw,
    format: formatMw,
    context: (state) => `${state.proposedGenerators.toLocaleString()} proposed generators`,
    explanation: "Proposed capacity is a development pipeline, not a construction forecast. Projects may change, be delayed, or never enter service.",
    include: (state) => state.proposedCapacityMw > 0
  }),
  "storage-capacity": ranking({
    title: "States Ranked by Energy Storage Capacity",
    shortTitle: "Storage capacity",
    description: "Compare operating storage nameplate capacity by state using finalized EIA-860 generator records.",
    question: "Which states report the most operating storage capacity?",
    value: (state) => state.capacityByFuelMw.storage ?? 0,
    format: formatMw,
    context: (state) => `${percent(state.capacityByFuelMw.storage ?? 0, state.operatingCapacityMw).toFixed(1)}% of state capacity`,
    explanation: "Storage capacity describes rated power output, not stored energy duration. A complete storage comparison also needs energy capacity in megawatt-hours.",
    include: (state) => (state.capacityByFuelMw.storage ?? 0) > 0
  })
};

for (const route of rankingRoutes) if (!rankings[route]) throw new Error(`Missing ranking definition: ${route}`);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), renderDirectory());
for (const route of rankingRoutes) {
  const directory = path.join(outputDir, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderPage(route, rankings[route]));
}
console.log(`Generated ${rankingRoutes.length} state ranking pages.`);

function ranking(config) {
  const rows = states.filter(config.include).map((state) => ({ ...state, rankingValue: config.value(state) })).sort((a, b) => b.rankingValue - a.rankingValue);
  return { ...config, rows };
}

function renderDirectory() {
  const cards = rankingRoutes.map((route, index) => {
    const item = rankings[route];
    const leader = item.rows[0];
    return `<a class="ranking-card" href="/rankings/${route}/"><span>0${index + 1} &middot; State ranking</span><h2>${item.shortTitle}</h2><p>${item.description}</p><dl><dt>Current leader</dt><dd>${leader.name}</dd><dt>Reported value</dt><dd>${item.format(leader.rankingValue)}</dd></dl><b>View all states &rarr;</b></a>`;
  }).join("");
  return shell({
    title: "US State Electricity Rankings",
    description: "Rank US states by operating power capacity, renewable share, nuclear capacity, proposed generation, and energy storage using sourced EIA data.",
    canonical: `${siteUrl}/rankings/`,
    body: `<main class="ranking-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>Rankings</b></nav><header class="ranking-hero"><p class="eyebrow">Final EIA-860 2024 state totals</p><h1>US state electricity rankings</h1><p>Compare every state using reproducible definitions, then open the profiles behind each number.</p></header><section class="ranking-grid">${cards}</section><section class="method"><div><p class="eyebrow">How to read rankings</p><h2>One metric, one claim</h2></div><p>Capacity, generation, and demand answer different questions. Each ranking defines its denominator, exclusions, and limitations before drawing conclusions.</p><div><a href="/methodology/">Methodology</a><a href="/guides/how-the-us-power-grid-works/">Grid basics</a></div></section></main>`
  });
}

function renderPage(route, item) {
  const canonical = `${siteUrl}/rankings/${route}/`;
  const top = item.rows.slice(0, 10);
  const compareStates = top.slice(0, 4).map((state) => state.state).join(",");
  const schema = { "@context": "https://schema.org", "@type": "ItemList", name: item.title, numberOfItems: item.rows.length, itemListElement: top.map((state, index) => ({ "@type": "ListItem", position: index + 1, name: state.name, url: `${siteUrl}/states/${state.slug}/` })) };
  return shell({
    title: item.title,
    description: item.description,
    canonical,
    schema,
    body: `<main class="ranking-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/rankings/">Rankings</a><span>/</span><b>${item.shortTitle}</b></nav><header class="ranking-hero"><p class="eyebrow">State ranking &middot; Final EIA-860 2024</p><h1>${item.title}</h1><p>${item.question}</p><div class="ranking-leader"><span>#1</span><strong>${top[0].name}</strong><b>${item.format(top[0].rankingValue)}</b><small>${item.context(top[0])}</small></div></header><section class="ranking-explainer"><div><p class="eyebrow">Definition</p><h2>What this ranking measures</h2></div><p>${item.explanation}</p></section>${rankingBars(top, item)}${fullTable(item)}<section class="ranking-actions"><div><p class="eyebrow">Compare the leaders</p><h2>See their full portfolios</h2><p>Move beyond one metric and compare fuel mix, plants, and proposed capacity.</p></div><a href="/?view=analysis&amp;states=${compareStates}">Compare top four states</a><a href="/states/">Browse state profiles</a></section>${relatedRankings(route)}</main>`
  });
}

function rankingBars(rows, item) {
  const max = rows[0].rankingValue;
  return `<section class="ranking-chart" aria-label="Top 10 states"><div class="section-heading"><div><p class="eyebrow">Top 10</p><h2>${item.shortTitle}</h2></div><small>Ranked high to low</small></div>${rows.map((state, index) => `<a href="/states/${state.slug}/"><span>${index + 1}</span><strong>${state.name}</strong><i><b style="width:${Math.max(2, state.rankingValue / max * 100)}%"></b></i><em>${item.format(state.rankingValue)}</em></a>`).join("")}</section>`;
}

function fullTable(item) {
  return `<section class="ranking-table-section"><div class="section-heading"><div><p class="eyebrow">Complete ranking</p><h2>All qualifying states</h2></div><small>${item.rows.length} entries</small></div><div class="guide-table-wrap"><table><thead><tr><th>Rank</th><th>State</th><th>${item.shortTitle}</th><th>Context</th><th>Profile</th></tr></thead><tbody>${item.rows.map((state, index) => `<tr><td>${index + 1}</td><td><strong>${state.name}</strong><small>${state.state}</small></td><td><strong>${item.format(state.rankingValue)}</strong></td><td>${item.context(state)}</td><td><a href="/states/${state.slug}/">Open profile &rarr;</a></td></tr>`).join("")}</tbody></table></div></section>`;
}

function relatedRankings(current) {
  return `<section class="profile-links ranking-related"><div><p class="eyebrow">More rankings</p><h2>Change the question</h2><a class="all-states-link" href="/rankings/">All rankings &rarr;</a></div>${rankingRoutes.filter((route) => route !== current).slice(0, 3).map((route) => `<a href="/rankings/${route}/"><span>State ranking</span><strong>${rankings[route].shortTitle}</strong><b>View ranking &rarr;</b></a>`).join("")}</section>`;
}

function shell({ title, description, canonical, body, schema }) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | US Grid Explorer</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/state-pages.css">${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}${renderAnalyticsScript()}</head><body class="ranking-page">${renderSiteHeader("rankings")}${body}${renderSiteFooter("State rankings from finalized EIA-860 data")}</body></html>`;
}

function renewableCapacity(state) { return renewableFuels.reduce((sum, fuel) => sum + (state.capacityByFuelMw[fuel] ?? 0), 0); }
function percent(value, total) { return total ? value / total * 100 : 0; }
function formatMw(value) { return `${Math.round(value).toLocaleString()} MW`; }
function slugify(value) { return value.toLowerCase().replaceAll(",", "").replaceAll(".", "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
