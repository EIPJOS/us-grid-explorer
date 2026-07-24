import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpen,
  Database,
  Map,
  MapPinned,
  Network,
  Newspaper,
  Radio,
  ShieldCheck,
  TrendingUp,
  Zap
} from "lucide-react";
import DigestSignup from "./DigestSignup.jsx";

/**
 * Landing view shown at "/" by default. Scrollable marketing page that
 * explains what the site does, surfaces every major section (most of which
 * were previously only reachable via the nav bar), and gives new visitors a
 * reason to either explore the map or convert into a lead (Permit Alerts,
 * weekly digest). Reuses the same colors/icons/fonts/shapes documented in
 * docs/DESIGN_SYSTEM.md -- no new design language introduced here.
 */
export default function HomeView({ plantCount, dataCenterCount, onNavigate }) {
  const stats = [
    { icon: <Zap size={18} />, value: plantCount.toLocaleString(), label: "Power plants tracked", note: "EIA 2025 early release" },
    { icon: <Database size={18} />, value: dataCenterCount.toLocaleString(), label: "Data centers mapped", note: "Community-sourced, nationwide" },
    { icon: <MapPinned size={18} />, value: "51", label: "State profiles", note: "50 states + Washington, DC" },
    { icon: <Network size={18} />, value: "7", label: "Grid regions covered", note: "ISOs and RTOs" }
  ];

  const features = [
    {
      icon: <Map size={18} />,
      title: "Explore the map",
      body: "Nationwide power plants, data centers, transmission lines, and substations on one interactive map.",
      action: () => onNavigate("explore")
    },
    {
      icon: <MapPinned size={18} />,
      title: "My area report",
      body: "Look up the infrastructure near any address or ZIP code and get a local summary.",
      action: () => onNavigate("area")
    },
    {
      icon: <Database size={18} />,
      title: "Facilities directory",
      body: "Search and filter every tracked power plant and data center in one sortable table.",
      action: () => onNavigate("facilities")
    },
    {
      icon: <Radio size={18} />,
      title: "Grid signals",
      body: "Live-adjacent EIA-930 demand and generation data broken out by region.",
      action: () => onNavigate("signals")
    },
    {
      icon: <Newspaper size={18} />,
      title: "Data center feeds",
      body: "Federal Register filings, grid data, and news signals relevant to data center development.",
      action: () => onNavigate("data_center_watch")
    },
    {
      icon: <BookOpen size={18} />,
      title: "Learn the grid",
      body: "Short lessons and data stories that build a working mental model of how the grid operates.",
      action: () => onNavigate("learn")
    },
    {
      icon: <TrendingUp size={18} />,
      title: "State rankings",
      body: "Compare states by operating capacity, renewable share, and proposed development.",
      href: "/rankings/"
    },
    {
      icon: <BarChart3 size={18} />,
      title: "Grid regions",
      body: "Profiles for every major ISO/RTO, including live regional demand snapshots.",
      href: "/regions/"
    }
  ];

  return (
    <main className="view-shell home-view">
      <section className="home-hero">
        <p className="eyebrow">Nationwide grid &amp; data center intelligence</p>
        <h1>See where America's power grid meets the data center boom</h1>
        <p className="home-hero-lede">
          Track power plants, data centers, transmission, and live grid signals nationwide — plus
          county-level permit alerts for the markets where new data centers are actually getting approved.
        </p>
        <div className="home-hero-actions">
          <button type="button" className="primary" onClick={() => onNavigate("explore")}>
            <Map size={16} /> Explore the live map
          </button>
          <a className="secondary" href="/data-center-permits/">
            <BellRing size={16} /> Get permit alerts
          </a>
        </div>
      </section>

      <section className="home-stats" aria-label="Coverage stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <i>{stat.icon}</i>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
            <small>{stat.note}</small>
          </article>
        ))}
      </section>

      <section className="home-section-heading">
        <h2>Everything on the site, in one place</h2>
        <p>Most of this is reachable from the nav above — here's what each section actually does.</p>
      </section>

      <section className="home-feature-grid">
        {features.map((feature) =>
          feature.href ? (
            <a key={feature.title} className="home-feature-card" href={feature.href}>
              <i>{feature.icon}</i>
              <strong>{feature.title}</strong>
              <p>{feature.body}</p>
            </a>
          ) : (
            <button key={feature.title} type="button" className="home-feature-card" onClick={feature.action}>
              <i>{feature.icon}</i>
              <strong>{feature.title}</strong>
              <p>{feature.body}</p>
            </button>
          )
        )}
      </section>

      <section className="home-permit-spotlight">
        <div>
          <p className="eyebrow">Now live in Northern Virginia</p>
          <h2>Get notified the moment a new data center permit is filed</h2>
          <p>
            Grid Permit Alerts tracks every land-use filing tied to data center development in
            Loudoun County, VA — rezonings, special exceptions, substations, and the hearing
            dates attached to them — delivered as a weekly digest. More markets are next.
          </p>
        </div>
        <a className="primary" href="/data-center-permits/">
          View Permit Alerts <ArrowRight size={16} />
        </a>
      </section>

      <section className="home-newsletter-band">
        <DigestSignup />
      </section>

      <section className="home-trust-strip">
        <a href="/methodology/">
          <ShieldCheck size={14} /> Every figure on this site is sourced and dated — see our methodology
        </a>
        <nav aria-label="More sections">
          <a href="/directories/">Fuel directories</a>
          <a href="/guides/">Guides</a>
          <a href="/glossary/">Glossary</a>
          <a href="/sources/">Sources</a>
        </nav>
      </section>
    </main>
  );
}
