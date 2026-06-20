import { renderAnalyticsScript, renderSiteFooter, renderSiteHeader, siteUrl } from "../scripts/site-shell.mjs";

const fuelLabels = {
  oil_gas: "Oil & gas", coal: "Coal", nuclear: "Nuclear", wind: "Wind",
  solar: "Solar", hydro: "Hydro", storage: "Storage", biomass: "Biomass",
  geothermal: "Geothermal", other: "Industrial & other"
};

const fuelColors = {
  oil_gas: "#ff6257", coal: "#8d99ae", nuclear: "#ffd84d", wind: "#86a8ff",
  solar: "#ffbe3d", hydro: "#4cc9f0", storage: "#bd80ff", biomass: "#69e2ae",
  geothermal: "#ff925c", other: "#c0c7d3"
};

const stateSlugs = {
  AL:"alabama",AK:"alaska",AZ:"arizona",AR:"arkansas",CA:"california",CO:"colorado",CT:"connecticut",DE:"delaware",FL:"florida",GA:"georgia",HI:"hawaii",ID:"idaho",IL:"illinois",IN:"indiana",IA:"iowa",KS:"kansas",KY:"kentucky",LA:"louisiana",ME:"maine",MD:"maryland",MA:"massachusetts",MI:"michigan",MN:"minnesota",MS:"mississippi",MO:"missouri",MT:"montana",NE:"nebraska",NV:"nevada",NH:"new-hampshire",NJ:"new-jersey",NM:"new-mexico",NY:"new-york",NC:"north-carolina",ND:"north-dakota",OH:"ohio",OK:"oklahoma",OR:"oregon",PA:"pennsylvania",RI:"rhode-island",SC:"south-carolina",SD:"south-dakota",TN:"tennessee",TX:"texas",UT:"utah",VT:"vermont",VA:"virginia",WA:"washington",WV:"west-virginia",WI:"wisconsin",WY:"wyoming",DC:"washington-dc"
};

export function renderPlantPage(plant, relatedPlants = []) {
  const properties = plant.properties;
  const canonical = `${siteUrl}/plants/${properties.plantCode}/`;
  const status = properties.projectStatus || (properties.operatingCapacityMw > 0 ? "operating" : "proposed");
  const headlineCapacity = properties.operatingCapacityMw > 0 ? properties.operatingCapacityMw : properties.proposedCapacityMw;
  const headlineLabel = properties.operatingCapacityMw > 0 ? "Operating capacity" : "Proposed capacity";
  const description = `${plant.name} is a ${fuelLabel(properties.primaryFuel).toLowerCase()} power facility in ${properties.city}, ${properties.state}, with ${formatMw(headlineCapacity)} of ${headlineLabel.toLowerCase()}.`;
  const stateSlug = stateSlugs[properties.state];
  const technologies = properties.technologies?.length ? properties.technologies : ["Not reported"];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plant.name)} Power Plant | US Grid Explorer</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(plant.name)} Power Plant">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <link rel="stylesheet" href="/state-pages.css">
  <script type="application/ld+json">${safeJson({
    "@context": "https://schema.org",
    "@type": "Place",
    name: plant.name,
    description,
    url: canonical,
    geo: { "@type": "GeoCoordinates", latitude: plant.geometry.coordinates[1], longitude: plant.geometry.coordinates[0] },
    address: { "@type": "PostalAddress", addressLocality: properties.city, addressRegion: properties.state, postalCode: properties.zip, addressCountry: "US" },
    identifier: { "@type": "PropertyValue", propertyID: "EIA plant code", value: String(properties.plantCode) }
  })}</script>
${renderAnalyticsScript()}
</head>
<body class="plant-page">
  ${renderSiteHeader()}
  <main>
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/?view=facilities">Facilities</a><span>/</span><b>${escapeHtml(plant.name)}</b></nav>
    <section class="plant-hero">
      <div>
        <div class="data-status"><span class="preliminary">Preliminary 2025 facility record</span><span class="${status === "proposed" ? "community" : "final"}">${formatLabel(status)}</span></div>
        <p class="eyebrow">${escapeHtml(properties.city)}, ${escapeHtml(properties.state)} &middot; EIA plant ${properties.plantCode}</p>
        <h1>${escapeHtml(plant.name)}</h1>
        <p class="lede">${escapeHtml(description)}</p>
        <div class="hero-actions"><a class="primary" href="/?plant=${properties.plantCode}">Open on map</a>${stateSlug ? `<a href="/states/${stateSlug}/">View ${properties.state} profile</a>` : ""}<a href="https://www.eia.gov/electricity/data/eia860/">Open EIA source</a></div>
      </div>
      <aside><span>${headlineLabel}</span><strong>${formatMw(headlineCapacity)}</strong><b style="color:${fuelColors[properties.primaryFuel] ?? fuelColors.other}">${fuelLabel(properties.primaryFuel)}</b><small>${formatLabel(status)} facility record</small></aside>
    </section>

    <section class="metrics plant-metrics" aria-label="Facility metrics">
      ${metric("Operating capacity", formatMw(properties.operatingCapacityMw), `${properties.operatingGenerators.toLocaleString()} operating generators`)}
      ${metric("Proposed capacity", formatMw(properties.proposedCapacityMw), `${properties.proposedGenerators.toLocaleString()} proposed generators`)}
      ${metric("Utility", escapeHtml(properties.utilityName || "Not reported"), "EIA-reported operator")}
      ${metric("Balancing authority", escapeHtml(properties.balancingAuthorityCode || "Not reported"), escapeHtml(properties.balancingAuthorityName || "Not reported"))}
    </section>

    <section class="content-grid plant-content-grid">
      <article class="panel">
        <div class="section-heading"><div><p class="eyebrow">Capacity profile</p><h2>Fuel and technology</h2></div><small>Nameplate capacity</small></div>
        ${capacitySection("Operating", properties.capacityByFuelMw)}
        ${capacitySection("Proposed", properties.proposedCapacityByFuelMw)}
        <div class="technology-list"><span>Reported technologies</span>${technologies.map((technology) => `<b>${escapeHtml(technology)}</b>`).join("")}</div>
      </article>
      <aside class="panel facility-facts">
        <p class="eyebrow">Facility record</p><h2>Location and ownership</h2>
        <dl>
          ${detail("City", properties.city)}${detail("County", properties.county ? `${properties.county} County` : "Not reported")}${detail("State", properties.state)}${detail("ZIP code", properties.zip || "Not reported")}${detail("NERC region", properties.nercRegion || "Not reported")}${detail("EIA plant code", properties.plantCode)}
        </dl>
        <a class="coordinate-link" href="/?plant=${properties.plantCode}">${plant.geometry.coordinates[1].toFixed(4)}, ${plant.geometry.coordinates[0].toFixed(4)} &rarr;</a>
      </aside>
    </section>

    ${relatedPlants.length ? `<section class="profile-links plant-related"><div><p class="eyebrow">Nearby in ${escapeHtml(properties.state)}</p><h2>Related facilities</h2></div>${relatedPlants.map(relatedCard).join("")}</section>` : ""}

    <section class="method"><div><p class="eyebrow">Source quality</p><h2>Preliminary facility data</h2></div><p>This page uses the EIA-860 2025 Early Release. EIA identifies the release as preliminary, so it should not be used for official state or national aggregation. Capacity is nameplate capacity, not real-time output or annual generation.</p><div><a href="/methodology/">Read methodology</a><a href="https://www.eia.gov/electricity/data/eia860/">EIA-860 source</a></div></section>
  </main>
  ${renderSiteFooter(`EIA plant ${properties.plantCode} · Source checked June 18, 2026`)}
</body>
</html>`;
}

export function findRelatedPlants(plants, plant, limit = 4) {
  return plants
    .filter((candidate) => candidate.id !== plant.id && candidate.properties.state === plant.properties.state)
    .map((candidate) => ({ candidate, distance: distanceMiles(plant.geometry.coordinates, candidate.geometry.coordinates) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ candidate, distance }) => ({ ...candidate, distance }));
}

function metric(label, value, note) { return `<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`; }
function detail(label, value) { return `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`; }
function fuelLabel(value) { return fuelLabels[value] ?? formatLabel(value); }
function formatLabel(value) { return String(value || "Not reported").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatMw(value) { return `${Math.round(Number(value) || 0).toLocaleString()} MW`; }

function capacitySection(label, capacityByFuel = {}) {
  const fuels = Object.entries(capacityByFuel).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  if (!fuels.length) return `<div class="capacity-group empty"><strong>${label}</strong><span>No ${label.toLowerCase()} capacity reported</span></div>`;
  const max = fuels[0][1];
  return `<div class="capacity-group"><strong>${label}</strong>${fuels.map(([fuel, value]) => `<div><span><i style="background:${fuelColors[fuel] ?? fuelColors.other}"></i>${fuelLabel(fuel)}</span><b>${formatMw(value)}</b><em><i style="width:${Math.max(2, value / max * 100)}%;background:${fuelColors[fuel] ?? fuelColors.other}"></i></em></div>`).join("")}</div>`;
}

function relatedCard(plant) {
  return `<a href="/plants/${plant.properties.plantCode}/"><span>${escapeHtml(plant.properties.state)} &middot; ${plant.distance.toFixed(1)} mi</span><strong>${escapeHtml(plant.name)}</strong><b>${formatMw(plant.properties.operatingCapacityMw || plant.properties.proposedCapacityMw)} &rarr;</b></a>`;
}

function distanceMiles([longitudeA, latitudeA], [longitudeB, latitudeB]) {
  const radians = (value) => value * Math.PI / 180;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function safeJson(value) { return JSON.stringify(value).replaceAll("<", "\\u003c"); }
