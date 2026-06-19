import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const outputDir = path.join(publicDir, "states");
const siteUrl = "https://us-grid-explorer.vercel.app";

const profiles = {
  VA: { name: "Virginia", slug: "virginia", context: "Virginia connects a large natural-gas fleet with nuclear, hydro, and rapidly expanded solar capacity. Its mapped data-center footprint makes the relationship between electricity supply and concentrated digital demand especially visible." },
  TX: { name: "Texas", slug: "texas", context: "Texas operates the country's largest state power system by nameplate capacity in this dataset. Natural gas remains its largest resource while wind, solar, and storage make the state one of the most varied generation portfolios to explore." },
  CA: { name: "California", slug: "california", context: "California combines a large natural-gas fleet with substantial solar, hydro, storage, wind, and geothermal capacity. The result is a diverse system where resource mix and flexibility matter as much as the total capacity number." },
  PA: { name: "Pennsylvania", slug: "pennsylvania", context: "Pennsylvania's grid profile is anchored by natural gas and one of the nation's largest nuclear fleets. Its position within the PJM region also makes the state important to the wider Mid-Atlantic power system." },
  AZ: { name: "Arizona", slug: "arizona", context: "Arizona's power system balances natural gas with major nuclear, solar, hydro, and storage resources. Strong proposed capacity makes it a useful case study in how a fast-growing state may reshape its generation mix." }
};

const fuelLabels = {
  oil_gas: "Oil & gas", coal: "Coal", nuclear: "Nuclear", wind: "Wind",
  solar: "Solar", hydro: "Hydro", storage: "Storage", biomass: "Biomass",
  geothermal: "Geothermal", other: "Other"
};

const fuelColors = {
  oil_gas: "#ff6257", coal: "#8d99ae", nuclear: "#ffd84d", wind: "#86a8ff",
  solar: "#ffbe3d", hydro: "#4cc9f0", storage: "#bd80ff", biomass: "#69e2ae",
  geothermal: "#ff925c", other: "#c0c7d3"
};

const [analysisPayload, plantPayload, centerPayload] = await Promise.all([
  readJson("data/state-analysis.json"),
  readJson("data/power-plants.json"),
  readJson("data/data-centers.json")
]);

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const [code, profile] of Object.entries(profiles)) {
  const state = analysisPayload.states.find((entry) => entry.state === code);
  if (!state) throw new Error(`Missing state analysis for ${code}`);

  const plants = plantPayload.features
    .filter((plant) => plant.properties.state === code)
    .sort((a, b) => b.properties.operatingCapacityMw - a.properties.operatingCapacityMw);
  const dataCenters = centerPayload.features.filter((center) => center.properties.state === code);
  const html = renderPage({ code, profile, state, plants, dataCenterCount: dataCenters.length });
  const directory = path.join(outputDir, profile.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
}

await writeFile(path.join(publicDir, "sitemap.xml"), renderSitemap());
await writeFile(path.join(publicDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
console.log(`Generated ${Object.keys(profiles).length} state intelligence pages.`);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(publicDir, relativePath), "utf8"));
}

function renderPage({ code, profile, state, plants, dataCenterCount }) {
  const fuels = Object.entries(state.capacityByFuelMw)
    .map(([key, value]) => ({ key, label: fuelLabels[key] ?? titleCase(key), value }))
    .filter((fuel) => fuel.value > 0)
    .sort((a, b) => b.value - a.value);
  const dominant = fuels[0];
  const dominantShare = percent(dominant.value, state.operatingCapacityMw);
  const proposedShare = percent(state.proposedCapacityMw, state.operatingCapacityMw);
  const canonical = `${siteUrl}/states/${profile.slug}/`;
  const title = `${profile.name} Power Grid: Plants, Capacity & Fuel Mix`;
  const description = `Explore ${profile.name}'s ${formatMw(state.operatingCapacityMw)} of operating power capacity, ${state.plantCount.toLocaleString()} plants, fuel mix, largest facilities, and mapped data centers.`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | US Grid Explorer</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/state-pages.css">
  <script type="application/ld+json">${safeJson({
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${profile.name} electric power infrastructure profile`,
    description,
    url: canonical,
    spatialCoverage: { "@type": "Place", name: profile.name },
    temporalCoverage: "2024",
    creator: { "@type": "Organization", name: "US Grid Explorer" },
    isBasedOn: "https://www.eia.gov/electricity/data/eia860/"
  })}</script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/"><span>US</span><strong>US Grid Explorer<small>Infrastructure intelligence</small></strong></a>
    <nav><a href="/">Explore map</a><a href="/?view=analysis&amp;state=${code}">Compare states</a><a href="#methodology">Sources</a></nav>
  </header>
  <main>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/?view=analysis">State analysis</a><span>/</span><b>${profile.name}</b></nav>
    <section class="hero">
      <div>
        <p class="eyebrow">${code} &middot; State grid profile</p>
        <h1>${profile.name} power grid</h1>
        <p class="lede">${profile.context}</p>
        <div class="hero-actions"><a class="primary" href="/?view=analysis&amp;state=${code}">Compare ${profile.name}</a><a href="/">Open national map</a></div>
      </div>
      <aside><span>Largest capacity source</span><strong>${dominant.label}</strong><b>${dominantShare}%</b><small>of operating nameplate capacity</small></aside>
    </section>

    <section class="metrics" aria-label="${profile.name} grid metrics">
      ${metric("Operating capacity", formatMw(state.operatingCapacityMw), "Final EIA-860 2024")}
      ${metric("Power plants", state.plantCount.toLocaleString(), `${state.operatingGenerators.toLocaleString()} operating generators`)}
      ${metric("Proposed capacity", formatMw(state.proposedCapacityMw), `${proposedShare}% of current capacity`)}
      ${metric("Data centers mapped", dataCenterCount.toLocaleString(), "Community-reported coverage")}
    </section>

    <section class="content-grid">
      <article class="panel fuel-panel">
        <div class="section-heading"><div><p class="eyebrow">Generation portfolio</p><h2>${profile.name} capacity by fuel</h2></div><small>Nameplate capacity &middot; MW</small></div>
        <div class="fuel-list">${fuels.map((fuel) => fuelBar(fuel, dominant.value, state.operatingCapacityMw)).join("")}</div>
      </article>
      <aside class="panel takeaways">
        <p class="eyebrow">At a glance</p><h2>What the data says</h2>
        <ul>
          <li><strong>${dominant.label}</strong> is the largest source at ${dominantShare}% of operating capacity.</li>
          <li>The state reports <strong>${state.proposedGenerators.toLocaleString()} proposed generators</strong> totaling ${formatMw(state.proposedCapacityMw)}.</li>
          <li>The five largest mapped plants represent <strong>${percent(sumCapacity(plants.slice(0, 5)), state.operatingCapacityMw)}%</strong> of statewide operating capacity.</li>
          <li>Data-center coverage includes <strong>${dataCenterCount.toLocaleString()} community-mapped locations</strong> and should not be treated as a complete inventory.</li>
        </ul>
      </aside>
    </section>

    <section class="panel plants-panel">
      <div class="section-heading"><div><p class="eyebrow">Facility intelligence</p><h2>Largest ${profile.name} power plants</h2></div><small>EIA-860 2025 early release facility records</small></div>
      <div class="table-wrap"><table><thead><tr><th>Plant</th><th>Primary fuel</th><th>Location</th><th>Utility</th><th>Operating capacity</th></tr></thead><tbody>
        ${plants.slice(0, 10).map(plantRow).join("")}
      </tbody></table></div>
    </section>

    <section class="profile-links">
      <div><p class="eyebrow">Keep exploring</p><h2>Compare another state</h2></div>
      ${Object.entries(profiles).filter(([otherCode]) => otherCode !== code).map(([otherCode, other]) => `<a href="/states/${other.slug}/"><span>${otherCode}</span><strong>${other.name}</strong><b>View profile &rarr;</b></a>`).join("")}
    </section>

    <section class="method" id="methodology">
      <div><p class="eyebrow">Methodology</p><h2>Transparent by design</h2></div>
      <p>State totals and fuel mix use finalized EIA-860 2024 generator data. The facility table uses the EIA-860 2025 Early Release and is preliminary. Data-center counts use OpenStreetMap community records and measure mapped coverage, not the full market.</p>
      <div><a href="https://www.eia.gov/electricity/data/eia860/">EIA-860 source</a><a href="https://www.openstreetmap.org/">OpenStreetMap</a></div>
    </section>
  </main>
  <footer><span>US Grid Explorer</span><span>Data checked June 18, 2026</span><a href="/">Interactive map</a></footer>
</body>
</html>`;
}

function metric(label, value, note) {
  return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
}

function fuelBar(fuel, maxValue, total) {
  return `<div class="fuel-row"><div><i style="background:${fuelColors[fuel.key] ?? fuelColors.other}"></i><strong>${fuel.label}</strong><span>${percent(fuel.value, total)}%</span><b>${formatMw(fuel.value)}</b></div><div class="track"><i style="width:${Math.max(1, percent(fuel.value, maxValue))}%;background:${fuelColors[fuel.key] ?? fuelColors.other}"></i></div></div>`;
}

function plantRow(plant) {
  const properties = plant.properties;
  return `<tr><td><strong>${escapeHtml(plant.name)}</strong><small>Plant ${properties.plantCode}</small></td><td><span class="fuel-pill"><i style="background:${fuelColors[properties.primaryFuel] ?? fuelColors.other}"></i>${fuelLabels[properties.primaryFuel] ?? titleCase(properties.primaryFuel)}</span></td><td>${escapeHtml(properties.city)}, ${escapeHtml(properties.state)}<small>${escapeHtml(properties.county)} County</small></td><td>${escapeHtml(properties.utilityName)}</td><td><strong>${formatMw(properties.operatingCapacityMw)}</strong></td></tr>`;
}

function renderSitemap() {
  const urls = [siteUrl, ...Object.values(profiles).map((profile) => `${siteUrl}/states/${profile.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc><changefreq>monthly</changefreq></url>`).join("\n")}\n</urlset>\n`;
}

function formatMw(value) {
  return `${Math.round(value).toLocaleString()} MW`;
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function sumCapacity(plants) {
  return plants.reduce((sum, plant) => sum + plant.properties.operatingCapacityMw, 0);
}

function titleCase(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
