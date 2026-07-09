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

// Primary nav icons, matching the app's top nav (src/App.jsx: lucide-react at
// 16px, strokeWidth 2 -- see docs/DESIGN_SYSTEM.md section 2). Path data
// copied verbatim from node_modules/lucide-react/dist/esm/icons so these
// stay pixel-identical to the React icons even though these pages render
// plain static HTML instead of JSX. Added 2026-07-09 to fix the biggest
// design-system drift found in the site audit: the static nav had no icons
// at all, unlike every React view.
function navIcon(inner) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const NAV_ICONS = {
  // Map (explore) -- same icon as the app's "Explore" nav item.
  explore: navIcon('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'),
  // MapPinned (area) -- same icon as the app's "My area" nav item.
  area: navIcon('<path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/>'),
  // Landmark (state profiles) -- static-only section, no direct app equivalent.
  states: navIcon('<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'),
  // ChartColumn/BarChart3 (rankings) -- same family as the app's "Analysis" icon.
  rankings: navIcon('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  // Layers (directories) -- echoes the in-app "Map Layers" panel icon language.
  directories: navIcon('<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>'),
  // Network (grid regions) -- same icon Learn view uses for grid topology concepts.
  regions: navIcon('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>'),
  // BookOpen (guides) -- same icon as the app's "Learn" nav item.
  guides: navIcon('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),
  // Newspaper (feeds) -- same icon as the app's "Feeds" nav item.
  watch: navIcon('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>'),
  // BellRing (permit alerts) -- same icon as the app's "Permit Alerts" trust-link.
  permits: navIcon('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M22 8c0-2.3-.8-4.3-2-6"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/>'),
  // Type (glossary) -- static-only section, no direct app equivalent.
  glossary: navIcon('<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>'),
  // ShieldCheck (trust center) -- same icon as the app's "Trust center" trust-link.
  trust: navIcon('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>')
};

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
    <nav aria-label="Primary navigation">${links.map(([key, href, label]) => `<a${active === key ? ' class="active"' : ""} href="${href}"><span class="nav-icon">${NAV_ICONS[key] || ""}</span>${label}</a>`).join("")}</nav>
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
