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

// Nav icons, matching the app's nav exactly (src/App.jsx: lucide-react at
// 16px, strokeWidth 2 -- see docs/DESIGN_SYSTEM.md section 2). Path data
// copied verbatim from node_modules/lucide-react/dist/esm/icons so these
// stay pixel-identical to the React icons even though these pages render
// plain static HTML instead of JSX.
//
// Nav structure unified 2026-07-09 (Austin's decision): one shared nav for
// the whole site, matching the React app's/homepage's style. 7 primary items
// identical to src/App.jsx's topbar nav, a "More" dropdown for the 6
// static-only content-hub sections that have no SPA view equivalent, and the
// same two right-side trust-links the app already has. See App.jsx for the
// React-side implementation of the identical structure.
function navIcon(inner) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const ICONS = {
  map: navIcon('<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'),
  mapPinned: navIcon('<path d="M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0"/><circle cx="12" cy="8" r="2"/><path d="M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712"/>'),
  database: navIcon('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>'),
  radio: navIcon('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>'),
  newspaper: navIcon('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>'),
  chartColumn: navIcon('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
  bookOpen: navIcon('<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>'),
  landmark: navIcon('<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'),
  layers: navIcon('<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>'),
  network: navIcon('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>'),
  type: navIcon('<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>'),
  bellRing: navIcon('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M22 8c0-2.3-.8-4.3-2-6"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/>'),
  shieldCheck: navIcon('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
  chevronDown: navIcon('<path d="m6 9 6 6 6-6"/>'),
  menu: navIcon('<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>')
};

// Same 7 primary items as src/App.jsx's topbar nav, in the same order. Views
// that live inside the React SPA link to "/?view=X" (matching changeView()'s
// own pushState scheme in App.jsx) so a click from a static page lands
// directly on that view in the app.
const PRIMARY_NAV = [
  ["explore", "/?view=explore", "Explore", ICONS.map],
  ["area", "/?view=area", "My area", ICONS.mapPinned],
  ["facilities", "/?view=facilities", "Facilities", ICONS.database],
  ["signals", "/?view=signals", "Grid signals", ICONS.radio],
  ["watch", "/data-center-watch/", "Feeds", ICONS.newspaper],
  ["analysis", "/?view=analysis", "Analysis", ICONS.chartColumn],
  ["learn", "/?view=learn", "Learn", ICONS.bookOpen]
];

// The 6 static-only content-hub sections, grouped under "More" -- these have
// no SPA view equivalent, so they stay as their own static routes.
const MORE_NAV = [
  ["states", "/states/", "State profiles", ICONS.landmark],
  ["rankings", "/rankings/", "Rankings", ICONS.chartColumn],
  ["directories", "/directories/", "Directories", ICONS.layers],
  ["regions", "/regions/", "Grid regions", ICONS.network],
  ["guides", "/guides/", "Guides", ICONS.bookOpen],
  ["glossary", "/glossary/", "Glossary", ICONS.type]
];

// Same right-side trust-links as src/App.jsx's topbar-meta.
const TRUST_NAV = [
  ["permits", "/data-center-permits/", "Permit Alerts", ICONS.bellRing],
  ["trust", "/methodology/", "Trust center", ICONS.shieldCheck]
];

export function renderAnalyticsScript() {
  return analyticsEnabled ? '<script defer src="/_vercel/insights/script.js"></script>' : "";
}

export function renderSiteHeader(active = "") {
  const moreActive = MORE_NAV.some(([key]) => key === active);
  const navLink = ([key, href, label, icon]) =>
    `<a${active === key ? ' class="active"' : ""} href="${href}"><span class="nav-icon">${icon}</span>${label}</a>`;
  const primary = PRIMARY_NAV.map(navLink).join("");
  const moreItems = MORE_NAV.map(navLink).join("");
  const trust = TRUST_NAV.map(([key, href, label, icon]) =>
    `<a class="trust-link${active === key ? " active" : ""}" href="${href}"><span class="nav-icon">${icon}</span>${label}</a>`
  ).join("");
  const mobileTrustItems = TRUST_NAV.map(([key, href, label, icon]) =>
    `<a${active === key ? ' class="active"' : ""} href="${href}"><span class="nav-icon">${icon}</span>${label}</a>`
  ).join("");
  return `<header class="site-header">
    <details class="mobile-nav">
      <summary aria-label="Open menu"><span class="nav-icon">${ICONS.menu}</span></summary>
      <div class="mobile-mega-menu" role="dialog" aria-label="Site navigation">
        <div class="mobile-mega-col">
          <span class="mobile-mega-label">Explore</span>
          ${primary}
        </div>
        <div class="mobile-mega-col">
          <span class="mobile-mega-label">Resources</span>
          ${moreItems}
        </div>
        <div class="mobile-mega-trust">${mobileTrustItems}</div>
      </div>
    </details>
    <a class="brand" href="/"><span>${brandZapIcon}</span><strong>US Grid Explorer<small>Infrastructure intelligence</small></strong></a>
    <nav aria-label="Primary navigation">${primary}<details class="nav-more"${moreActive ? " open" : ""}><summary><span class="nav-icon">${ICONS.chevronDown}</span>More</summary><div class="nav-more-menu">${moreItems}</div></details></nav>
    <div class="site-header-meta">${trust}</div>
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
