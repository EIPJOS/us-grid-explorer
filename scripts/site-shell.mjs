export const siteUrl = "https://usgridexplorer.com";
export const contactEmail = "contact@usgridexplorer.com";
export const trustRoutes = ["about", "methodology", "sources", "privacy", "terms", "corrections"];
export const guideRoutes = ["how-the-us-power-grid-works", "nuclear-power-by-state", "renewable-capacity-by-state", "data-centers-and-electricity-demand"];
export const rankingRoutes = ["operating-capacity", "renewable-share", "nuclear-capacity", "proposed-capacity", "storage-capacity"];
export const fuelDirectoryRoutes = ["nuclear", "coal", "oil-and-gas", "solar", "wind", "energy-storage"];
export const regionRoutes = ["pjm", "ercot", "caiso", "miso", "nyiso", "iso-ne", "spp"];
export const glossaryRoutes = ["balancing-authority", "capacity", "capacity-factor", "demand", "distributed-generation", "electricity-generation", "energy-storage", "generator", "independent-system-operator", "interconnection", "megawatt", "megawatt-hour", "nameplate-capacity", "power-grid", "power-plant", "renewable-energy", "regional-transmission-organization", "substation", "transmission", "wholesale-electricity-market"];
export const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED === "true";

export function renderAnalyticsScript() {
  return analyticsEnabled ? '<script defer src="/_vercel/insights/script.js"></script>' : "";
}

export function renderSiteHeader(active = "") {
  const links = [
    ["explore", "/", "Explore map"],
    ["area", "/?view=area", "My area"],
    ["states", "/states/", "State profiles"],
    ["rankings", "/rankings/", "Rankings"],
    ["directories", "/directories/", "Directories"],
    ["regions", "/regions/", "Grid regions"],
    ["guides", "/guides/", "Guides"],
    ["watch", "/data-center-watch/", "Data Center Watch"],
    ["glossary", "/glossary/", "Glossary"],
    ["trust", "/methodology/", "Trust center"]
  ];
  return `<header class="site-header">
    <a class="brand" href="/"><span>US</span><strong>US Grid Explorer<small>Infrastructure intelligence</small></strong></a>
    <nav aria-label="Primary navigation">${links.map(([key, href, label]) => `<a${active === key ? ' class="active"' : ""} href="${href}">${label}</a>`).join("")}</nav>
  </header>`;
}

export function renderSiteFooter(detail = "Sourced public infrastructure data") {
  return `<footer class="site-footer">
    <div><strong>US Grid Explorer</strong><span>${detail}</span></div>
    <nav aria-label="Trust and policy links">
      <a href="/about/">About</a>
      <a href="/methodology/">Methodology</a>
      <a href="/sources/">Sources</a>
      <a href="/privacy/">Privacy</a>
      <a href="/terms/">Terms</a>
      <a href="mailto:${contactEmail}">Contact</a>
      <a href="/corrections/">Corrections</a>
    </nav>
  </footer>`;
}
