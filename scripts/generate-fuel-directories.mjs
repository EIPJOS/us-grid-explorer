import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fuelDirectoryRoutes, renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "./site-shell.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const outputDir = path.join(publicDir, "directories");
const dataDir = path.join(publicDir, "data", "fuel-directories");
const payload = JSON.parse(await readFile(path.join(publicDir, "data", "power-plants.json"), "utf8"));

const definitions = {
  nuclear: { key: "nuclear", title: "US Nuclear Power Plant Directory", label: "Nuclear", color: "#ffd84d", description: "Search reported US nuclear power plants by state, capacity, utility, and operating status.", note: "Nuclear facilities are grouped by each plant's primary EIA technology category." },
  coal: { key: "coal", title: "US Coal Power Plant Directory", label: "Coal", color: "#8d99ae", description: "Search reported US coal power plants by state, capacity, utility, and operating status.", note: "Coal facilities include plants whose primary grouped fuel category is coal." },
  "oil-and-gas": { key: "oil_gas", title: "US Oil and Gas Power Plant Directory", label: "Oil & gas", color: "#ff6257", description: "Search reported US oil- and gas-fired power plants by state, capacity, technology, and utility.", note: "EIA technologies grouped here can include natural gas, petroleum liquids, petroleum coke, and other gases. This page does not treat every record as natural gas." },
  solar: { key: "solar", title: "US Solar Power Plant Directory", label: "Solar", color: "#ffbe3d", description: "Search reported US solar power facilities by state, capacity, utility, and operating status.", note: "Facility counts are not generator counts. One plant record can contain multiple operating or proposed generators." },
  wind: { key: "wind", title: "US Wind Power Plant Directory", label: "Wind", color: "#86a8ff", description: "Search reported US wind power facilities by state, capacity, utility, and operating status.", note: "Wind facilities are grouped by each plant's primary EIA technology category." },
  "energy-storage": { key: "storage", title: "US Energy Storage Facility Directory", label: "Energy storage", color: "#bd80ff", description: "Search reported US energy-storage facilities by state, power capacity, utility, and operating status.", note: "Displayed megawatts describe power capacity. Storage duration and energy capacity in megawatt-hours are separate measurements." }
};

for (const route of fuelDirectoryRoutes) if (!definitions[route]) throw new Error(`Missing directory definition: ${route}`);
await rm(outputDir, { recursive: true, force: true });
await rm(dataDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const directories = {};
for (const route of fuelDirectoryRoutes) {
  const definition = definitions[route];
  const records = payload.features
    .filter((plant) => plant.properties.primaryFuel === definition.key)
    .map(compactPlant)
    .sort((a, b) => b.capacityMw - a.capacityMw || a.name.localeCompare(b.name));
  directories[route] = records;
  await writeFile(path.join(dataDir, `${route}.json`), JSON.stringify(records));
  const directory = path.join(outputDir, route);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), renderDirectoryPage(route, definition, records));
}
await writeFile(path.join(outputDir, "index.html"), renderHub());
console.log(`Generated ${fuelDirectoryRoutes.length} fuel facility directories.`);

function compactPlant(plant) {
  const p = plant.properties;
  const operating = Number(p.operatingCapacityMw) || 0;
  const proposed = Number(p.proposedCapacityMw) || 0;
  return {
    id: Number(p.plantCode), name: plant.name, city: p.city, state: p.state,
    utility: p.utilityName || "Not reported", capacityMw: Math.max(operating, proposed),
    operatingMw: operating, proposedMw: proposed,
    status: p.projectStatus || (operating > 0 ? "operating" : "proposed"),
    technology: p.technologies?.[0] || "Not reported"
  };
}

function renderHub() {
  const cards = fuelDirectoryRoutes.map((route) => {
    const definition = definitions[route];
    const records = directories[route];
    const operatingCapacity = records.reduce((sum, record) => sum + record.operatingMw, 0);
    const stateCount = new Set(records.map((record) => record.state)).size;
    return `<a class="fuel-directory-card" href="/directories/${route}/" style="--fuel:${definition.color}"><span>${definition.label}</span><h2>${definition.title.replace("US ", "").replace(" Directory", "")}</h2><p>${definition.description}</p><dl><div><dt>Facilities</dt><dd>${records.length.toLocaleString()}</dd></div><div><dt>States</dt><dd>${stateCount}</dd></div><div><dt>Operating capacity</dt><dd>${formatMw(operatingCapacity)}</dd></div></dl><b>Open directory &rarr;</b></a>`;
  }).join("");
  return shell({
    title: "US Power Plant Directories",
    description: "Browse searchable US power plant directories for nuclear, coal, oil and gas, solar, wind, and energy storage facilities.",
    canonical: `${siteUrl}/directories/`,
    body: `<main class="fuel-main"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>Directories</b></nav><header class="fuel-hero"><p class="eyebrow">Facility discovery</p><h1>US power plant directories</h1><p>Search nationwide facility records by energy category, state, status, capacity, and utility.</p><div class="data-status"><span class="preliminary">EIA-860 2025 Early Release</span><span class="reported">Preliminary facility records</span></div></header><section class="fuel-directory-grid">${cards}</section><section class="method"><div><p class="eyebrow">Coverage</p><h2>Facilities, not real-time output</h2></div><p>These directories use preliminary facility records for discovery. Capacity is nameplate capacity, and a facility's presence does not describe current generation or availability.</p><div><a href="/methodology/">Methodology</a><a href="/sources/">Sources</a></div></section></main>`
  });
}

function renderDirectoryPage(route, definition, records) {
  const canonical = `${siteUrl}/directories/${route}/`;
  const operating = records.filter((record) => record.operatingMw > 0);
  const proposed = records.filter((record) => record.proposedMw > 0);
  const operatingCapacity = operating.reduce((sum, record) => sum + record.operatingMw, 0);
  const proposedCapacity = records.reduce((sum, record) => sum + record.proposedMw, 0);
  const stateCounts = [...records.reduce((map, record) => map.set(record.state, (map.get(record.state) ?? 0) + 1), new Map())].sort((a, b) => b[1] - a[1]);
  const schema = { "@context": "https://schema.org", "@type": "Dataset", name: definition.title, description: definition.description, url: canonical, temporalCoverage: "2025", creator: { "@type": "Organization", name: "US Grid Explorer" }, isBasedOn: "https://www.eia.gov/electricity/data/eia860/" };
  return shell({
    title: definition.title,
    description: definition.description,
    canonical,
    schema,
    body: `<main class="fuel-main" style="--fuel:${definition.color}"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/directories/">Directories</a><span>/</span><b>${definition.label}</b></nav><header class="fuel-hero"><p class="eyebrow">Nationwide facility directory</p><h1>${definition.title}</h1><p>${definition.description}</p><div class="data-status"><span class="preliminary">Preliminary 2025 records</span><span class="reported">Updated June 2026</span></div></header><section class="directory-metrics fuel-metrics">${metric("Facilities", records.length.toLocaleString(), `${operating.length.toLocaleString()} with operating capacity`)}${metric("Operating capacity", formatMw(operatingCapacity), "Reported nameplate capacity")}${metric("Proposed capacity", formatMw(proposedCapacity), `${proposed.length.toLocaleString()} records with proposed capacity`)}</section><section class="fuel-state-summary"><div><p class="eyebrow">Geographic footprint</p><h2>States with the most records</h2></div>${stateCounts.slice(0, 6).map(([state, count], index) => `<a href="/states/${stateSlug(state)}/"><span>${index + 1}</span><strong>${state}</strong><b>${count.toLocaleString()} facilities</b></a>`).join("")}</section><section class="fuel-browser" data-source="/data/fuel-directories/${route}.json"><div class="section-heading"><div><p class="eyebrow">Search all records</p><h2>${definition.label} facilities</h2></div><small>Preliminary EIA facility data</small></div><div class="fuel-controls"><label><span>Search</span><input id="fuel-search" type="search" placeholder="Plant, city, or utility"></label><label><span>State</span><select id="fuel-state"><option value="">All states</option>${[...new Set(records.map((record) => record.state))].sort().map((state) => `<option>${state}</option>`).join("")}</select></label><label><span>Status</span><select id="fuel-status"><option value="">All statuses</option><option value="operating">Operating</option><option value="proposed">Proposed</option><option value="mixed">Operating + proposed</option></select></label><label><span>Sort</span><select id="fuel-sort"><option value="capacity">Capacity</option><option value="name">Plant name</option><option value="state">State</option></select></label></div><p id="fuel-results" class="fuel-results">Showing the largest ${Math.min(50, records.length)} of ${records.length.toLocaleString()} records</p><div class="guide-table-wrap"><table><thead><tr><th>Plant</th><th>Location</th><th>Status</th><th>Technology</th><th>Capacity</th></tr></thead><tbody id="fuel-table">${records.slice(0, 50).map(recordRow).join("")}</tbody></table></div><button id="fuel-more" class="fuel-more" type="button"${records.length <= 50 ? " hidden" : ""}>Show 50 more</button></section><aside class="guide-source fuel-note"><strong>Category note</strong><p>${definition.note}</p><a href="/methodology/">Methodology</a><a href="https://www.eia.gov/electricity/data/eia860/">EIA source</a></aside>${relatedDirectories(route)}</main><script>${browserScript()}</script>`
  });
}

function recordRow(record) {
  return `<tr><td><a href="/plants/${record.id}/"><strong>${escapeHtml(record.name)}</strong><small>EIA plant ${record.id}</small></a></td><td>${escapeHtml(record.city)}, ${record.state}<small>${escapeHtml(record.utility)}</small></td><td><span class="status ${record.status === "proposed" ? "community" : record.status === "mixed" ? "preliminary" : "final"}">${titleCase(record.status)}</span></td><td>${escapeHtml(record.technology)}</td><td><strong>${formatMw(record.capacityMw)}</strong><small>${record.operatingMw > 0 ? "Operating" : "Proposed"}</small></td></tr>`;
}

function browserScript() {
  return `(() => { const browser=document.querySelector('.fuel-browser'); if(!browser)return; const body=document.querySelector('#fuel-table'), search=document.querySelector('#fuel-search'), state=document.querySelector('#fuel-state'), status=document.querySelector('#fuel-status'), sort=document.querySelector('#fuel-sort'), results=document.querySelector('#fuel-results'), more=document.querySelector('#fuel-more'); let records=[],limit=50,filtered=[]; const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); const mw=(v)=>Math.round(Number(v)||0).toLocaleString()+' MW'; const label=(v)=>String(v||'Not reported').replaceAll('_',' ').replace(/\\b\\w/g,c=>c.toUpperCase()); const statusClass=(v)=>v==='proposed'?'community':v==='mixed'?'preliminary':'final'; function row(r){return '<tr><td><a href="/plants/'+r.id+'/"><strong>'+esc(r.name)+'</strong><small>EIA plant '+r.id+'</small></a></td><td>'+esc(r.city)+', '+esc(r.state)+'<small>'+esc(r.utility)+'</small></td><td><span class="status '+statusClass(r.status)+'">'+label(r.status)+'</span></td><td>'+esc(r.technology)+'</td><td><strong>'+mw(r.capacityMw)+'</strong><small>'+(r.operatingMw>0?'Operating':'Proposed')+'</small></td></tr>'} function update(reset=true){if(reset)limit=50; const q=search.value.trim().toLowerCase(); filtered=records.filter(r=>(!q||[r.name,r.city,r.utility].some(v=>String(v).toLowerCase().includes(q)))&&(!state.value||r.state===state.value)&&(!status.value||r.status===status.value)); filtered.sort(sort.value==='name'?(a,b)=>a.name.localeCompare(b.name):sort.value==='state'?(a,b)=>a.state.localeCompare(b.state)||b.capacityMw-a.capacityMw:(a,b)=>b.capacityMw-a.capacityMw); body.innerHTML=filtered.slice(0,limit).map(row).join(''); results.textContent='Showing '+Math.min(limit,filtered.length).toLocaleString()+' of '+filtered.length.toLocaleString()+' matching records'; more.hidden=limit>=filtered.length} [search,state,status,sort].forEach(el=>el.addEventListener(el===search?'input':'change',()=>update())); more.addEventListener('click',()=>{limit+=50;update(false)}); fetch(browser.dataset.source).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{records=data;update()}).catch(()=>{results.textContent='Full directory could not load. Showing the largest published records.'}); })();`;
}

function relatedDirectories(current) {
  return `<section class="profile-links fuel-related"><div><p class="eyebrow">More directories</p><h2>Explore another category</h2><a class="all-states-link" href="/directories/">All directories &rarr;</a></div>${fuelDirectoryRoutes.filter((route) => route !== current).slice(0, 3).map((route) => `<a href="/directories/${route}/" style="--fuel:${definitions[route].color}"><span>${definitions[route].label}</span><strong>${definitions[route].title.replace("US ", "").replace(" Directory", "")}</strong><b>Open directory &rarr;</b></a>`).join("")}</section>`;
}

function shell({ title, description, canonical, body, schema }) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | US Grid Explorer</title><meta name="description" content="${description}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="/state-pages.css">${schema ? `<script type="application/ld+json">${safeJson(schema)}</script>` : ""}${renderAnalyticsScript()}</head><body class="fuel-page">${renderSiteHeader("directories")}${body}${renderSiteFooter("Preliminary EIA-860 facility directories")}</body></html>`;
}

function metric(label, value, note) { return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`; }
function stateSlug(code) { const names={AL:"alabama",AK:"alaska",AZ:"arizona",AR:"arkansas",CA:"california",CO:"colorado",CT:"connecticut",DE:"delaware",FL:"florida",GA:"georgia",HI:"hawaii",ID:"idaho",IL:"illinois",IN:"indiana",IA:"iowa",KS:"kansas",KY:"kentucky",LA:"louisiana",ME:"maine",MD:"maryland",MA:"massachusetts",MI:"michigan",MN:"minnesota",MS:"mississippi",MO:"missouri",MT:"montana",NE:"nebraska",NV:"nevada",NH:"new-hampshire",NJ:"new-jersey",NM:"new-mexico",NY:"new-york",NC:"north-carolina",ND:"north-dakota",OH:"ohio",OK:"oklahoma",OR:"oregon",PA:"pennsylvania",RI:"rhode-island",SC:"south-carolina",SD:"south-dakota",TN:"tennessee",TX:"texas",UT:"utah",VT:"vermont",VA:"virginia",WA:"washington",WV:"west-virginia",WI:"wisconsin",WY:"wyoming",DC:"washington-dc"}; return names[code] ?? ""; }
function formatMw(value) { return `${Math.round(Number(value) || 0).toLocaleString()} MW`; }
function titleCase(value) { return String(value || "Not reported").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }
function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
