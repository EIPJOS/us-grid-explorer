import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { guideRoutes, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "guides");
const statePayload = JSON.parse(await readFile(path.join(root, "public", "data", "state-analysis.json"), "utf8"));
const centerPayload = JSON.parse(await readFile(path.join(root, "public", "data", "data-centers.json"), "utf8"));

const stateNames = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",DC:"Washington, D.C."
};
const renewableFuels = ["solar", "wind", "hydro", "geothermal", "biomass"];
const states = statePayload.states.map((state) => ({ ...state, name: stateNames[state.state], slug: slugify(stateNames[state.state]) }));
const centerCounts = centerPayload.features.reduce((counts, center) => {
  const code = center.properties.state;
  if (code) counts[code] = (counts[code] ?? 0) + 1;
  return counts;
}, {});

const guides = {
  "how-the-us-power-grid-works": {
    title: "How the US Power Grid Works",
    description: "Learn how power plants, transmission lines, substations, balancing authorities, capacity, generation, and electricity demand fit together.",
    eyebrow: "Grid fundamentals",
    lede: "A practical guide to the infrastructure and measurements behind the electricity map.",
    content: gridGuide()
  },
  "nuclear-power-by-state": {
    title: "Nuclear Power Capacity by State",
    description: "Compare reported nuclear nameplate capacity across US states and understand what capacity does and does not measure.",
    eyebrow: "State comparison",
    lede: "Which states report the most nuclear capacity, and how large is nuclear within each state portfolio?",
    content: nuclearGuide()
  },
  "renewable-capacity-by-state": {
    title: "Renewable Power Capacity by State",
    description: "Compare solar, wind, hydro, geothermal, and biomass nameplate capacity across US states using finalized EIA-860 data.",
    eyebrow: "State comparison",
    lede: "Two rankings reveal different leaders: total renewable capacity and renewable share of a state's portfolio.",
    content: renewableGuide()
  },
  "data-centers-and-electricity-demand": {
    title: "Data Centers and Electricity Demand",
    description: "Understand why data-center locations, power capacity, grid demand, and service territory are different measurements.",
    eyebrow: "Infrastructure explainer",
    lede: "A mapped data center is a location signal, not a direct measurement of electricity use or grid impact.",
    content: dataCenterGuide()
  }
};

for (const route of guideRoutes) if (!guides[route]) throw new Error(`Missing guide: ${route}`);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), renderDirectory());
for (const route of guideRoutes) {
  const directory = path.join(outputDir, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderGuide(route, guides[route]));
}
console.log(`Generated ${guideRoutes.length} editorial guides.`);

function renderDirectory() {
  const cards = guideRoutes.map((route, index) => {
    const guide = guides[route];
    return `<a class="guide-card" href="/guides/${route}/"><span>0${index + 1} &middot; ${guide.eyebrow}</span><h2>${guide.title}</h2><p>${guide.description}</p><b>Read guide &rarr;</b></a>`;
  }).join("");
  return pageShell({
    title: "US Electricity Grid Guides",
    description: "Source-backed guides to US power plants, state fuel mixes, renewable and nuclear capacity, transmission, and data-center electricity demand.",
    canonical: `${siteUrl}/guides/`,
    bodyClass: "guide-directory-page",
    body: `<main class="guide-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>Guides</b></nav><header class="guide-hero"><p class="eyebrow">Electricity infrastructure, explained</p><h1>Understand the grid behind the map</h1><p>Use concise explanations and reproducible state rankings to move from a marker on a map to a better infrastructure question.</p></header><section class="guide-grid">${cards}</section><section class="method"><div><p class="eyebrow">Editorial standard</p><h2>Evidence before conclusions</h2></div><p>Rankings are generated from the same finalized EIA-860 state dataset used by US Grid Explorer profiles. Each guide separates nameplate capacity, generation, demand, and mapped coverage.</p><div><a href="/methodology/">Methodology</a><a href="/sources/">Source registry</a></div></section></main>`
  });
}

function renderGuide(route, guide) {
  const canonical = `${siteUrl}/guides/${route}/`;
  return pageShell({
    title: guide.title,
    description: guide.description,
    canonical,
    bodyClass: "guide-page",
    schema: { "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description, url: canonical, author: { "@type": "Organization", name: "US Grid Explorer" }, dateModified: "2026-06-20" },
    body: `<main class="guide-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/guides/">Guides</a><span>/</span><b>${guide.title}</b></nav><header class="guide-hero"><p class="eyebrow">${guide.eyebrow}</p><h1>${guide.title}</h1><p>${guide.lede}</p><div class="data-status"><span class="final">Final EIA-860 2024 state totals</span><span class="reported">Updated June 20, 2026</span></div></header><article class="guide-article">${guide.content}</article>${relatedGuides(route)}</main>`
  });
}

function pageShell({ title, description, canonical, body, bodyClass, schema }) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | US Grid Explorer</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/state-pages.css">${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}${renderAnalyticsScript()}</head><body class="${bodyClass}">${renderSiteHeader("guides")}${body}${renderSiteFooter("Editorial guides backed by public infrastructure data")}</body></html>`;
}

function gridGuide() {
  const totalCapacity = states.reduce((sum, state) => sum + state.operatingCapacityMw, 0);
  return `<section><h2>The grid is a connected system, not a single machine</h2><p>The United States does not operate one centrally controlled power grid. Utilities, power producers, transmission owners, balancing authorities, regional markets, and regulators coordinate many connected systems. Electricity must be balanced continuously: generation and imports must respond as demand, exports, weather, and equipment availability change.</p><p>US Grid Explorer reports <strong>${formatMw(totalCapacity)}</strong> of nameplate capacity across state profiles. That number describes rated equipment capability. It is not the amount being generated now.</p></section>
  <section><h2>From a power plant to an outlet</h2><ol class="guide-steps"><li><strong>Generation</strong><span>Power plants convert fuel, flowing water, wind, sunlight, or stored energy into electricity.</span></li><li><strong>Step-up substation</strong><span>Transformers raise voltage so electricity can move efficiently over long distances.</span></li><li><strong>Transmission</strong><span>High-voltage lines move bulk power between plants, regions, and major load areas.</span></li><li><strong>Distribution</strong><span>Local substations lower voltage before neighborhood lines deliver electricity to customers.</span></li></ol></section>
  ${definitionBlock()}
  <section><h2>Why a nearby plant may not power your home</h2><p>Electricity follows network conditions rather than a simple nearest-plant route. Market dispatch, transmission constraints, outages, contracts, and the local utility's service territory all matter. A map can show nearby infrastructure, but it cannot prove which generator serves a particular address.</p><div class="guide-actions"><a href="/?view=area">Build a local infrastructure report</a><a href="/?view=signals">View regional grid signals</a></div></section>
  ${sourceNote("This guide uses EIA terminology and the same EIA-860 capacity records as the state profiles.")}`;
}

function nuclearGuide() {
  const ranked = states.map((state) => ({ ...state, value: state.capacityByFuelMw.nuclear ?? 0, share: percent(state.capacityByFuelMw.nuclear ?? 0, state.operatingCapacityMw) })).filter((state) => state.value > 0).sort((a, b) => b.value - a.value);
  const top = ranked.slice(0, 10);
  return `<section><h2>States with the most nuclear nameplate capacity</h2><p><strong>${ranked.length} states</strong> report operating nuclear capacity in the finalized dataset. ${top[0].name} ranks first at ${formatMw(top[0].value)}, followed by ${top[1].name} and ${top[2].name}. This ranking is based on nameplate capacity, not annual nuclear generation.</p>${rankingTable(top, "Nuclear capacity", (state) => `${state.share}% of state capacity`)}</section>
  <section><h2>Total capacity and portfolio dependence tell different stories</h2><p>A large state can rank highly in nuclear megawatts while nuclear represents a smaller portion of its diverse fleet. A smaller state may depend more heavily on nuclear even with fewer total megawatts. Compare both columns before describing a state as “nuclear-powered.”</p>${barRanking([...ranked].sort((a,b) => b.share - a.share).slice(0, 8), "Nuclear share", (state) => state.share, "%")}</section>
  ${definitionBlock()}
  <section><h2>Use this ranking responsibly</h2><p>Nameplate capacity cannot answer how often reactors ran, how much electricity they generated, whether output was exported, or which customers received it. Those questions require generation and power-flow data.</p><div class="guide-actions"><a href="/?view=analysis&states=IL%2CPA%2CSC%2CNC">Compare nuclear states</a><a href="/states/illinois/">Open Illinois profile</a></div></section>${sourceNote("State totals use finalized EIA-860 2024 generator records. Values are rounded for display.")}`;
}

function renewableGuide() {
  const ranked = states.map((state) => {
    const value = renewableFuels.reduce((sum, fuel) => sum + (state.capacityByFuelMw[fuel] ?? 0), 0);
    return { ...state, value, share: percent(value, state.operatingCapacityMw) };
  }).sort((a,b) => b.value - a.value);
  const total = ranked.reduce((sum, state) => sum + state.value, 0);
  return `<section><h2>What counts as renewable here?</h2><p>This guide combines reported solar, wind, hydro, geothermal, and biomass nameplate capacity. Storage is shown separately in US Grid Explorer because it shifts electricity in time rather than identifying the original energy source. The state profiles report <strong>${formatMw(total)}</strong> across these five renewable categories.</p></section>
  <section><h2>Largest renewable portfolios by capacity</h2><p>Total megawatts highlight states with large fleets. They do not adjust for state size or total power-system capacity.</p>${rankingTable(ranked.slice(0, 10), "Renewable capacity", (state) => `${state.share}% of state capacity`)}</section>
  <section><h2>Highest renewable shares</h2><p>Portfolio share answers a different question: how much of each state's reported nameplate capacity belongs to the selected renewable categories?</p>${barRanking([...ranked].sort((a,b) => b.share - a.share).slice(0, 10), "Renewable share", (state) => state.share, "%")}</section>
  <section><h2>Capacity is not generation</h2><p>A megawatt of solar, wind, hydro, biomass, and geothermal capacity does not produce the same number of megawatt-hours each year. Weather, water, fuel availability, curtailment, maintenance, and operating economics affect output.</p><div class="guide-actions"><a href="/?view=analysis&states=TX%2CCA%2CWA%2CNY">Compare renewable leaders</a><a href="/states/">Browse all state profiles</a></div></section>${sourceNote("The renewable grouping is a US Grid Explorer editorial category built from finalized EIA-860 2024 generator records.")}`;
}

function dataCenterGuide() {
  const ranked = states.map((state) => ({ ...state, count: centerCounts[state.state] ?? 0 })).filter((state) => state.count > 0).sort((a,b) => b.count - a.count);
  const mapped = ranked.reduce((sum, state) => sum + state.count, 0);
  return `<section><h2>Four numbers that should not be confused</h2><div class="guide-definition-grid"><article><strong>Mapped locations</strong><p>Points reported by OpenStreetMap contributors. Useful for discovery, but incomplete.</p></article><article><strong>Facility capacity</strong><p>A site's designed IT or electrical load, often private, estimated, phased, or reported in different ways.</p></article><article><strong>Grid demand</strong><p>Electricity consumed across a balancing region at a moment or interval, not by one facility.</p></article><article><strong>Nameplate generation capacity</strong><p>Rated power-plant equipment capability. It does not represent power reserved for data centers.</p></article></div></section>
  <section><h2>Where community reports are concentrated</h2><p>The current map contains <strong>${mapped.toLocaleString()} community-reported data-center locations</strong>. The table describes mapping coverage, not a definitive market ranking.</p>${rankingTable(ranked.slice(0, 10), "Mapped locations", () => "OpenStreetMap coverage", "count")}</section>
  <section><h2>Why a marker cannot reveal grid impact</h2><p>A facility marker alone does not provide utility service territory, contracted demand, power usage effectiveness, backup generation, hourly load, expansion stage, or transmission constraints. Even a reported megawatt value may represent a future campus plan rather than current consumption.</p><p>A responsible analysis combines utility filings, planning documents, interconnection records, regional demand, and the date and confidence of each claim.</p></section>
  <section><h2>Questions the map can answer</h2><ul class="guide-checklist"><li>Which power plants and transmission lines are near a reported facility?</li><li>What generation technologies are present in the surrounding area?</li><li>Which regional grid signal is relevant to the broader location?</li><li>Where should a researcher look for utility and planning records next?</li></ul><div class="guide-actions"><a href="/?view=area">Explore infrastructure near a place</a><a href="/methodology/">Review coverage limits</a></div></section>${sourceNote("Data-center points use OpenStreetMap community records. Absence from the map does not mean a facility does not exist.")}`;
}

function definitionBlock() {
  return `<section><h2>Capacity, generation, and demand</h2><div class="guide-definition-grid"><article><strong>Capacity</strong><p>Maximum rated output under specified conditions, measured in megawatts.</p></article><article><strong>Generation</strong><p>Electricity produced over time, measured in megawatt-hours.</p></article><article><strong>Demand</strong><p>The rate customers consume electricity at a moment or interval, measured in megawatts.</p></article></div></section>`;
}

function rankingTable(rows, valueLabel, note, valueKey = "value") {
  return `<div class="guide-table-wrap"><table><thead><tr><th>Rank</th><th>State</th><th>${valueLabel}</th><th>Context</th></tr></thead><tbody>${rows.map((state, index) => `<tr><td>${index + 1}</td><td><a href="/states/${state.slug}/">${state.name}</a></td><td><strong>${valueKey === "count" ? state.count.toLocaleString() : formatMw(state[valueKey])}</strong></td><td>${note(state)}</td></tr>`).join("")}</tbody></table></div>`;
}

function barRanking(rows, label, value, suffix) {
  const max = Math.max(...rows.map(value));
  return `<div class="guide-ranking" aria-label="${label}">${rows.map((state, index) => `<a href="/states/${state.slug}/"><span>${index + 1}</span><strong>${state.name}</strong><i><b style="width:${Math.max(2, value(state) / max * 100)}%"></b></i><em>${value(state)}${suffix}</em></a>`).join("")}</div>`;
}

function relatedGuides(current) {
  return `<section class="profile-links guide-related"><div><p class="eyebrow">Keep learning</p><h2>Related guides</h2><a class="all-states-link" href="/guides/">Browse all guides &rarr;</a></div>${guideRoutes.filter((route) => route !== current).slice(0, 3).map((route) => `<a href="/guides/${route}/"><span>${guides[route].eyebrow}</span><strong>${guides[route].title}</strong><b>Read guide &rarr;</b></a>`).join("")}</section>`;
}

function sourceNote(text) {
  return `<aside class="guide-source"><strong>Source and limits</strong><p>${text}</p><a href="https://www.eia.gov/electricity/data/eia860/">EIA-860 source</a><a href="/methodology/">Full methodology</a></aside>`;
}

function percent(value, total) { return total ? Math.round(value / total * 1000) / 10 : 0; }
function formatMw(value) { return `${Math.round(value).toLocaleString()} MW`; }
function slugify(value) { return value.toLowerCase().replaceAll(",", "").replaceAll(".", "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
