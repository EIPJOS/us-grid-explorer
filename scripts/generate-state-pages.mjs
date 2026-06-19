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
  AZ: { name: "Arizona", slug: "arizona", context: "Arizona's power system balances natural gas with major nuclear, solar, hydro, and storage resources. Strong proposed capacity makes it a useful case study in how a fast-growing state may reshape its generation mix." },
  NY: { name: "New York", slug: "new-york", context: "New York combines a large natural-gas fleet with hydro, nuclear, wind, and growing solar capacity. Its mix spans dense downstate demand and resource-rich upstate regions within one interconnected system." },
  FL: { name: "Florida", slug: "florida", context: "Florida's generation fleet is strongly led by natural gas, with solar now its second-largest capacity category in this dataset. Nuclear and coal remain meaningful parts of a system serving sustained population and electricity-demand growth." },
  IL: { name: "Illinois", slug: "illinois", context: "Illinois pairs the largest nuclear category in its portfolio with substantial natural gas, wind, and coal capacity. That balance makes it a useful comparison point for both firm generation and Midwest renewable development." },
  OH: { name: "Ohio", slug: "ohio", context: "Ohio's operating capacity is led by natural gas, followed by coal, solar, and nuclear resources. Its profile shows how a historically thermal power system is adding a broader mix of proposed generation." },
  GA: { name: "Georgia", slug: "georgia", context: "Georgia combines natural gas with major nuclear, coal, solar, and hydro resources. The state's sizeable proposed portfolio adds another layer to a generation mix already spread across several technologies." },
  NC: { name: "North Carolina", slug: "north-carolina", context: "North Carolina's fleet is led by natural gas while solar, coal, and nuclear each contribute substantial capacity. Its unusually large number of plants reflects a broad facility footprint across the state." },
  WA: { name: "Washington", slug: "washington", context: "Washington stands apart from most states because hydro supplies more than two-thirds of its operating nameplate capacity. Natural gas, wind, nuclear, and biomass provide additional diversity around that hydro foundation." },
  OR: { name: "Oregon", slug: "oregon", context: "Oregon's capacity mix is led by hydro, followed by natural gas and wind. Proposed capacity is large relative to the current system, making the state useful for studying a changing Western resource portfolio." },
  NV: { name: "Nevada", slug: "nevada", context: "Nevada combines natural gas with a large and growing solar fleet, plus storage, hydro, and geothermal resources. Its proposed pipeline is sizeable compared with today's operating capacity." },
  NJ: { name: "New Jersey", slug: "new-jersey", context: "New Jersey's operating portfolio is dominated by natural gas, with nuclear providing most of the remaining large-scale capacity. Solar is widely distributed across a relatively large number of mapped facilities." }
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

const directoryStates = Object.entries(profiles).map(([code, profile]) => {
  const state = analysisPayload.states.find((entry) => entry.state === code);
  if (!state) throw new Error(`Missing state analysis for ${code}`);
  const dataCenterCount = centerPayload.features.filter((center) => center.properties.state === code).length;
  return { code, profile, state, dataCenterCount };
});

await writeFile(path.join(outputDir, "index.html"), renderDirectory(directoryStates));

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
    <nav><a href="/">Explore map</a><a href="/states/">State profiles</a><a href="/?view=analysis&amp;state=${code}">Compare states</a><a href="#methodology">Sources</a></nav>
  </header>
  <main>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/states/">States</a><span>/</span><b>${profile.name}</b></nav>
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

function renderDirectory(states) {
  const totalCapacity = states.reduce((sum, entry) => sum + entry.state.operatingCapacityMw, 0);
  const totalPlants = states.reduce((sum, entry) => sum + entry.state.plantCount, 0);
  const totalDataCenters = states.reduce((sum, entry) => sum + entry.dataCenterCount, 0);
  const cards = states.map(({ code, profile, state, dataCenterCount }) => {
    const fuels = Object.entries(state.capacityByFuelMw).sort((a, b) => b[1] - a[1]);
    const [dominantFuel, dominantCapacity] = fuels[0];
    const cleanCapacity = renewableCapacity(state);
    return `<article class="directory-card" data-name="${profile.name.toLowerCase()} ${code.toLowerCase()}" data-capacity="${state.operatingCapacityMw}" data-proposed="${state.proposedCapacityMw}" data-centers="${dataCenterCount}" data-renewable="${percent(cleanCapacity, state.operatingCapacityMw)}">
      <div class="directory-card-top"><span>${code}</span><label><input type="checkbox" value="${code}"> Compare</label></div>
      <a href="/states/${profile.slug}/">
        <h2>${profile.name}</h2>
        <p><i style="background:${fuelColors[dominantFuel] ?? fuelColors.other}"></i>${fuelLabels[dominantFuel] ?? titleCase(dominantFuel)} leads at ${percent(dominantCapacity, state.operatingCapacityMw)}%</p>
        <dl>
          <div><dt>Capacity</dt><dd>${formatMw(state.operatingCapacityMw)}</dd></div>
          <div><dt>Plants</dt><dd>${state.plantCount.toLocaleString()}</dd></div>
          <div><dt>Proposed</dt><dd>${formatMw(state.proposedCapacityMw)}</dd></div>
          <div><dt>Data centers</dt><dd>${dataCenterCount.toLocaleString()}</dd></div>
        </dl>
        <strong>Open grid profile &rarr;</strong>
      </a>
    </article>`;
  }).join("");

  const description = `Search and compare ${states.length} sourced US state power-grid profiles by operating capacity, fuel mix, proposed generation, and mapped data centers.`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>US State Power Grid Profiles | US Grid Explorer</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${siteUrl}/states/">
  <meta property="og:type" content="website">
  <meta property="og:title" content="US State Power Grid Profiles">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${siteUrl}/states/">
  <link rel="stylesheet" href="/state-pages.css">
</head>
<body class="directory-page">
  <header class="site-header">
    <a class="brand" href="/"><span>US</span><strong>US Grid Explorer<small>Infrastructure intelligence</small></strong></a>
    <nav><a href="/">Explore map</a><a href="/states/">State profiles</a><a href="/?view=analysis">Compare states</a></nav>
  </header>
  <main>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><b>State profiles</b></nav>
    <section class="directory-hero">
      <div><p class="eyebrow">State intelligence directory</p><h1>Find your state's power grid</h1><p>Search sourced profiles, compare infrastructure signals, and move from a statewide summary to the facilities behind the numbers.</p></div>
      <aside><strong>${states.length}</strong><span>published state profiles</span></aside>
    </section>
    <section class="directory-metrics">
      ${metric("Profiled capacity", formatMw(totalCapacity), "Final EIA-860 2024")}
      ${metric("Power plants", totalPlants.toLocaleString(), "Across published profiles")}
      ${metric("Data centers mapped", totalDataCenters.toLocaleString(), "Community-reported coverage")}
    </section>
    <section class="directory-toolbar" aria-label="State directory controls">
      <label><span>Search states</span><input id="state-search" type="search" placeholder="State name or abbreviation" autocomplete="off"></label>
      <label><span>Sort profiles</span><select id="state-sort"><option value="name">State name</option><option value="capacity">Operating capacity</option><option value="proposed">Proposed capacity</option><option value="centers">Mapped data centers</option><option value="renewable">Renewable share</option></select></label>
      <p id="directory-count">Showing ${states.length} profiles</p>
    </section>
    <section id="state-grid" class="directory-grid">${cards}</section>
    <div id="compare-dock" class="compare-dock" hidden><div><strong id="compare-count">0 states selected</strong><span id="compare-message">Select 2 to 4 states</span></div><button id="clear-comparison" type="button">Clear</button><button id="open-comparison" type="button" disabled>Compare states</button></div>
    <section class="method directory-method"><div><p class="eyebrow">Coverage</p><h2>Built for useful comparisons</h2></div><p>Profiles combine finalized EIA-860 2024 state totals, preliminary 2025 facility records, and community-reported OpenStreetMap data-center locations. Published coverage is expanding in reviewed groups so every page contains meaningful state-specific context.</p><a href="https://www.eia.gov/electricity/data/eia860/">Review EIA methodology</a></section>
  </main>
  <footer><span>US Grid Explorer</span><span>${states.length} state profiles</span><a href="/">Interactive map</a></footer>
  <script>${directoryScript()}</script>
</body>
</html>`;
}

function directoryScript() {
  return `(() => {
    const grid = document.querySelector("#state-grid");
    const cards = [...grid.querySelectorAll(".directory-card")];
    const search = document.querySelector("#state-search");
    const sort = document.querySelector("#state-sort");
    const count = document.querySelector("#directory-count");
    const dock = document.querySelector("#compare-dock");
    const compareCount = document.querySelector("#compare-count");
    const message = document.querySelector("#compare-message");
    const openButton = document.querySelector("#open-comparison");
    const clearButton = document.querySelector("#clear-comparison");

    function updateDirectory() {
      const query = search.value.trim().toLowerCase();
      const visible = cards.filter((card) => card.dataset.name.includes(query));
      cards.forEach((card) => card.hidden = !visible.includes(card));
      const key = sort.value;
      visible.sort((a, b) => key === "name" ? a.dataset.name.localeCompare(b.dataset.name) : Number(b.dataset[key]) - Number(a.dataset[key]));
      visible.forEach((card) => grid.append(card));
      count.textContent = "Showing " + visible.length + " profile" + (visible.length === 1 ? "" : "s");
    }

    function selectedCodes() {
      return cards.filter((card) => card.querySelector("input").checked).map((card) => card.querySelector("input").value);
    }

    function updateComparison(changedInput) {
      let selected = selectedCodes();
      if (selected.length > 4) {
        changedInput.checked = false;
        selected = selectedCodes();
        message.textContent = "Comparison is limited to 4 states";
      } else {
        message.textContent = selected.length < 2 ? "Select " + (2 - selected.length) + " more state" + (selected.length === 0 ? "s" : "") : "Ready to compare";
      }
      dock.hidden = selected.length === 0;
      compareCount.textContent = selected.length + " state" + (selected.length === 1 ? "" : "s") + " selected";
      openButton.disabled = selected.length < 2;
      openButton.dataset.states = selected.join(",");
    }

    search.addEventListener("input", updateDirectory);
    sort.addEventListener("change", updateDirectory);
    cards.forEach((card) => card.querySelector("input").addEventListener("change", (event) => updateComparison(event.target)));
    clearButton.addEventListener("click", () => { cards.forEach((card) => card.querySelector("input").checked = false); updateComparison(); });
    openButton.addEventListener("click", () => { if (openButton.dataset.states) window.location.href = "/?view=analysis&states=" + openButton.dataset.states; });
  })();`;
}

function renderSitemap() {
  const urls = [siteUrl, `${siteUrl}/states/`, ...Object.values(profiles).map((profile) => `${siteUrl}/states/${profile.slug}/`)];
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

function renewableCapacity(state) {
  return ["solar", "wind", "hydro", "geothermal", "biomass"]
    .reduce((sum, fuel) => sum + (state.capacityByFuelMw[fuel] ?? 0), 0);
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
