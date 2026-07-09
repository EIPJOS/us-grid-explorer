export const siteUrl = "https://usgridexplorer.com";
export const contactEmail = "contact@usgridexplorer.com";
export const trustRoutes = ["about", "methodology", "sources", "privacy", "terms", "corrections"];
export const guideRoutes = ["how-the-us-power-grid-works", "nuclear-power-by-state", "renewable-capacity-by-state", "data-centers-and-electricity-demand"];
export const rankingRoutes = ["operating-capacity", "renewable-share", "nuclear-capacity", "proposed-capacity", "storage-capacity"];
export const fuelDirectoryRoutes = ["nuclear", "coal", "oil-and-gas", "solar", "wind", "energy-storage"];
export const regionRoutes = ["pjm", "ercot", "caiso", "miso", "nyiso", "iso-ne", "spp"];
export const permitAlertsRoutes = ["loudoun-va", "dallas-fort-worth-tx", "phoenix-az", "chicago-il", "atlanta-ga"];
export const glossaryRoutes = ["balancing-authority", "capacity", "capacity-factor", "demand", "distributed-generation", "electricity-generation", "energy-storage", "generator", "independent-system-operator", "interconnection", "megawatt", "megawatt-hour", "nameplate-capacity", "power-grid", "power-plant", "renewable-energy", "regional-transmission-organization", "substation", "transmission", "wholesale-electricity-market"];
export const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED === "true";

// Matches the brand mark in src/App.jsx: lucide-react's Zap icon at 18px,
// strokeWidth 2.6 -- kept as inline SVG here since these pages are static
// HTML, not React. stroke="currentColor" picks up the dark brand-mark text
// color set by .brand > span in state-pages.css.
const brandZapIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';

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
    ["watch", "/data-center-watch/", "Feeds"],
    ["permits", "/data-center-permits/", "Permit Alerts"],
    ["glossary", "/glossary/", "Glossary"],
    ["trust", "/methodology/", "Trust center"]
  ];
  return `<header class="site-header">
    <a class="brand" href="/"><span>${brandZapIcon}</span><strong>US Grid Explorer<small>Infrastructure intelligence</small></strong></a>
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
