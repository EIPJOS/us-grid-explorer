import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { regionRoutes, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public", "regions");
const statePayload = JSON.parse(await readFile(path.join(root, "public", "data", "state-analysis.json"), "utf8"));
const statesByCode = new Map(statePayload.states.map((state) => [state.state, state]));
const stateNames = {
  AL:"Alabama",AR:"Arkansas",CA:"California",CT:"Connecticut",DC:"Washington, D.C.",DE:"Delaware",IA:"Iowa",IL:"Illinois",IN:"Indiana",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",MA:"Massachusetts",MD:"Maryland",ME:"Maine",MI:"Michigan",MN:"Minnesota",MO:"Missouri",MS:"Mississippi",MT:"Montana",NC:"North Carolina",ND:"North Dakota",NE:"Nebraska",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",OH:"Ohio",OK:"Oklahoma",PA:"Pennsylvania",RI:"Rhode Island",SD:"South Dakota",TN:"Tennessee",TX:"Texas",VA:"Virginia",VT:"Vermont",WI:"Wisconsin",WV:"West Virginia",WY:"Wyoming"
};

const regions = {
  pjm: {
    code: "PJM", name: "PJM Interconnection", short: "PJM", accent: "#86a8ff",
    dek: "Track hourly demand and explore the generation context around the Mid-Atlantic and parts of the Midwest.",
    footprint: "PJM coordinates wholesale electricity across all or parts of 13 states and Washington, D.C. Its electrical territory does not follow state borders.",
    states: ["DE","DC","IL","IN","KY","MD","MI","NJ","NC","OH","PA","TN","VA","WV"],
    official: "https://www.pjm.com/", coverage: "All or parts of 13 states + D.C."
  },
  ercot: {
    code: "ERCO", name: "Electric Reliability Council of Texas", short: "ERCOT", accent: "#ff6257",
    dek: "Follow demand in the largely self-contained Texas interconnection and open the state portfolio behind it.",
    footprint: "ERCOT manages the grid serving most of Texas. Parts of the state belong to other power regions, so Texas state totals are broader than ERCOT itself.",
    states: ["TX"], official: "https://www.ercot.com/", coverage: "Most of Texas"
  },
  caiso: {
    code: "CISO", name: "California Independent System Operator", short: "CAISO", accent: "#ffbe3d",
    dek: "Watch California ISO demand and connect the operating signal with California's diverse resource portfolio.",
    footprint: "CAISO operates most of California's high-voltage grid, but not every California utility is inside its balancing authority area. State totals are context, not CAISO totals.",
    states: ["CA"], official: "https://www.caiso.com/", coverage: "Most of California"
  },
  miso: {
    code: "MISO", name: "Midcontinent Independent System Operator", short: "MISO", accent: "#69e2ae",
    dek: "Explore hourly demand across a large central US footprint stretching from the Upper Midwest to the Gulf Coast.",
    footprint: "MISO's footprint spans all or parts of 15 US states and Manitoba. Membership and electrical boundaries are not equivalent to whole-state boundaries.",
    states: ["AR","IA","IL","IN","KY","LA","MI","MN","MO","MS","MT","ND","SD","TX","WI"],
    official: "https://www.misoenergy.org/", coverage: "All or parts of 15 US states"
  },
  nyiso: {
    code: "NYIS", name: "New York Independent System Operator", short: "NYISO", accent: "#bd80ff",
    dek: "Track New York's hourly demand and move from the statewide signal into its plant and fuel portfolio.",
    footprint: "NYISO operates New York's bulk electric grid and wholesale markets. The statewide EIA portfolio is useful context but follows a different reporting boundary.",
    states: ["NY"], official: "https://www.nyiso.com/", coverage: "New York"
  },
  "iso-ne": {
    code: "ISNE", name: "ISO New England", short: "ISO-NE", accent: "#4cc9f0",
    dek: "See current demand across the six New England states and compare the portfolios that sit inside the regional system.",
    footprint: "ISO New England serves Connecticut, Maine, Massachusetts, New Hampshire, Rhode Island, and Vermont as one regional power system.",
    states: ["CT","ME","MA","NH","RI","VT"], official: "https://www.iso-ne.com/", coverage: "6 New England states"
  },
  spp: {
    code: "SWPP", name: "Southwest Power Pool", short: "SPP", accent: "#ffd84d",
    dek: "Monitor demand across the central plains and connect it to state portfolios rich in wind, thermal generation, and hydro.",
    footprint: "SPP coordinates a broad central US footprint across all or parts of multiple states. State context below should not be summed into an SPP system total.",
    states: ["AR","IA","KS","LA","MN","MO","MT","NE","NM","ND","OK","SD","TX","WY"],
    official: "https://www.spp.org/", coverage: "Central US, across parts of 14 states"
  }
};

for (const route of regionRoutes) if (!regions[route]) throw new Error(`Missing region definition: ${route}`);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "index.html"), renderHub());
for (const route of regionRoutes) {
  const directory = path.join(outputDir, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderRegion(route, regions[route]));
}
console.log(`Generated ${regionRoutes.length} grid-region profiles.`);

function renderHub() {
  const cards = regionRoutes.map((route) => {
    const region = regions[route];
    return `<a class="region-card" style="--region:${region.accent}" href="/regions/${route}/"><span>${region.code} &middot; EIA-930</span><h2>${region.short}</h2><p>${region.dek}</p><dl><dt>Footprint</dt><dd>${region.coverage}</dd><dt>Signal</dt><dd>Hourly demand</dd></dl><b>Open region profile &rarr;</b></a>`;
  }).join("");
  return shell({
    title: "US Grid Region Profiles",
    description: "Explore PJM, ERCOT, CAISO, MISO, NYISO, ISO New England, and SPP with live EIA-930 hourly demand and sourced state context.",
    canonical: `${siteUrl}/regions/`,
    body: `<main class="region-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>Grid regions</b></nav><header class="region-hero"><p class="eyebrow">Balancing authorities &middot; EIA-930</p><h1>US grid region profiles</h1><p>Follow near-real-time demand, understand each operator's footprint, and use linked state profiles for generation context.</p></header><section class="region-directory">${cards}</section><section class="region-boundary-note"><div><p class="eyebrow">Important boundary note</p><h2>Grid regions are not state shapes</h2></div><p>Several operators serve only parts of a state, and some states cross multiple balancing authorities. State capacity is presented as nearby context and is never labeled as an operator total.</p><a href="/methodology/">Read methodology &rarr;</a></section></main>`
  });
}

function renderRegion(route, region) {
  const canonical = `${siteUrl}/regions/${route}/`;
  const contextStates = region.states.map((code) => ({ code, name: stateNames[code], data: statesByCode.get(code) })).filter((state) => state.name && state.data);
  const schema = { "@context":"https://schema.org", "@type":"Dataset", name:`${region.short} grid region profile`, description:region.dek, url:canonical, temporalCoverage:"P1H", isBasedOn:"https://www.eia.gov/electricity/gridmonitor/" };
  return shell({
    title: `${region.short} Grid Region Profile`, description: `${region.dek} Live demand is sourced from preliminary EIA-930 operating data.`, canonical, schema, region,
    body: `<main class="region-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/regions/">Grid regions</a><span>/</span><b>${region.short}</b></nav><header class="region-profile-hero"><div><p class="eyebrow">${region.code} &middot; Near-real-time grid operations</p><h1>${region.name}</h1><p>${region.dek}</p><div class="guide-actions"><a href="/?view=signals&amp;region=${region.code}">Open in Grid Signals</a><a href="${region.official}" target="_blank" rel="noreferrer">Official operator site</a></div></div><aside><span>Reported footprint</span><strong>${region.coverage}</strong><small>Electrical boundaries may cross state lines</small></aside></header>${liveSignal(region)}<section class="region-explainer"><div><p class="eyebrow">Coverage</p><h2>How to read this footprint</h2></div><p>${region.footprint}</p></section>${stateContext(contextStates, region)}<section class="region-sources"><div><p class="eyebrow">Sources and definitions</p><h2>Two datasets, two jobs</h2></div><dl><div><dt>Operating signal</dt><dd>EIA-930 hourly demand, preliminary</dd></div><div><dt>Generation context</dt><dd>EIA-860 2024 Final state plant records</dd></div><div><dt>Operator boundary</dt><dd>Descriptive only; consult the operator for current territory</dd></div></dl><div><a href="https://www.eia.gov/electricity/gridmonitor/about" target="_blank" rel="noreferrer">EIA Grid Monitor methodology</a><a href="/sources/">US Grid Explorer sources</a></div></section>${relatedRegions(route)}</main>`
  });
}

function liveSignal(region) {
  return `<section class="region-live" data-region-code="${region.code}" style="--region:${region.accent}"><div class="region-live-heading"><div><p class="eyebrow">Live operating signal</p><h2>${region.short} hourly demand</h2><p id="signal-status">Loading the latest EIA-930 report...</p></div><div><span>Latest reported hour</span><strong id="signal-time">Waiting</strong></div></div><div class="region-live-value"><span id="signal-value">--</span><small>MWh during the hour</small><b id="signal-change">Connecting to EIA</b></div><div class="region-sparkline" id="signal-chart" role="img" aria-label="Last 24 reported hours of demand"></div><p class="region-live-note">Preliminary hourly operating data can be revised. A missing live value does not mean electricity demand is zero.</p></section>`;
}

function stateContext(states, region) {
  return `<section class="region-state-context"><div class="section-heading"><div><p class="eyebrow">Generation context</p><h2>States connected to the ${region.short} footprint</h2></div><small>${states.length} linked profiles &middot; not a region total</small></div><div class="region-state-grid">${states.map(({ code, name, data }) => `<a href="/states/${slugify(name)}/"><span>${code}</span><strong>${name}</strong><b>${formatMw(data.operatingCapacityMw)}</b><small>${data.plantCount.toLocaleString()} plants statewide</small></a>`).join("")}</div></section>`;
}

function relatedRegions(current) {
  return `<section class="profile-links region-related"><div><p class="eyebrow">More operators</p><h2>Compare another region</h2><a class="all-states-link" href="/regions/">All grid regions &rarr;</a></div>${regionRoutes.filter((route) => route !== current).slice(0, 3).map((route) => `<a style="border-top:2px solid ${regions[route].accent}" href="/regions/${route}/"><span>EIA code ${regions[route].code}</span><strong>${regions[route].short}</strong><b>${regions[route].coverage}</b></a>`).join("")}</section>`;
}

function clientScript() {
  return `<script>(()=>{const root=document.querySelector('.region-live');if(!root)return;const code=root.dataset.regionCode;const status=document.getElementById('signal-status');const value=document.getElementById('signal-value');const change=document.getElementById('signal-change');const time=document.getElementById('signal-time');const chart=document.getElementById('signal-chart');const url=new URL('https://api.eia.gov/v2/electricity/rto/region-data/data/');url.searchParams.set('api_key','DEMO_KEY');url.searchParams.set('frequency','hourly');url.searchParams.append('data[0]','value');url.searchParams.append('facets[respondent][]',code);url.searchParams.append('facets[type][]','D');url.searchParams.append('sort[0][column]','period');url.searchParams.append('sort[0][direction]','desc');url.searchParams.set('length','24');fetch(url).then(r=>{if(!r.ok)throw new Error('EIA returned '+r.status);return r.json()}).then(payload=>{const rows=(payload.response?.data||[]).map(row=>({period:row.period,value:Number(row.value)})).filter(row=>Number.isFinite(row.value)).sort((a,b)=>a.period.localeCompare(b.period));if(!rows.length)throw new Error('No current records');const latest=rows.at(-1),previous=rows.at(-2);value.textContent=latest.value.toLocaleString();time.textContent=latest.period.replace('T',' ')+':00';status.textContent='EIA feed connected';if(previous?.value){const delta=(latest.value-previous.value)/previous.value*100;change.textContent=(delta>=0?'+':'')+delta.toFixed(1)+'% vs prior hour';change.className=delta>=0?'up':'down'}const width=760,height=150,pad=8,min=Math.min(...rows.map(r=>r.value)),max=Math.max(...rows.map(r=>r.value)),range=max-min||1;const points=rows.map((row,index)=>[(index/(rows.length-1||1))*(width-pad*2)+pad,height-pad-((row.value-min)/range)*(height-pad*2)]);chart.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="none" aria-hidden="true"><path class="spark-area" d="M '+points.map(p=>p.join(' ')).join(' L ')+' L '+(width-pad)+' '+(height-pad)+' L '+pad+' '+(height-pad)+' Z"/><polyline points="'+points.map(p=>p.join(',')).join(' ')+'"/></svg>'}).catch(error=>{status.textContent='Live feed temporarily unavailable';change.textContent='Try Grid Signals for another refresh';chart.innerHTML='<div class="signal-unavailable">'+error.message+'</div>'})})();</script>`;
}

function shell({ title, description, canonical, body, schema, region }) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | US Grid Explorer</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/state-pages.css">${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}${renderAnalyticsScript()}</head><body class="region-page"${region ? ` style="--region:${region.accent}"` : ""}>${renderSiteHeader("regions")}${body}${renderSiteFooter("Hourly EIA-930 demand and sourced grid-region context")}${region ? clientScript() : ""}</body></html>`;
}

function formatMw(value) { return `${Math.round(value).toLocaleString()} MW`; }
function slugify(value) { return value.toLowerCase().replaceAll(",", "").replaceAll(".", "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
