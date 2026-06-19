export const siteUrl = "https://us-grid-explorer.vercel.app";
export const trustRoutes = ["about", "methodology", "sources", "privacy", "terms", "corrections"];
export const analyticsEnabled = process.env.VITE_ANALYTICS_ENABLED === "true";

export function renderAnalyticsScript() {
  return analyticsEnabled ? '<script defer src="/_vercel/insights/script.js"></script>' : "";
}

export function renderSiteHeader(active = "") {
  const links = [
    ["explore", "/", "Explore map"],
    ["states", "/states/", "State profiles"],
    ["compare", "/?view=analysis", "Compare states"],
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
      <a href="/corrections/">Corrections</a>
    </nav>
  </footer>`;
}
