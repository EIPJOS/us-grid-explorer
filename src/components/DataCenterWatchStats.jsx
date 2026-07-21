import { Activity, Database, Landmark, Newspaper } from "lucide-react";

export default function DataCenterWatchStats({ items, loading = false }) {
  const regulationCount = items.filter((item) => ["government", "regulation", "local_permit"].includes(item.sourceType)).length;
  const gridCount = items.filter((item) => item.sourceType === "grid_data").length;
  const newsCount = items.filter((item) => ["news", "company"].includes(item.sourceType)).length;
  const topStates = Object.entries(
    items.reduce((counts, item) => {
      if (item.state) counts[item.state] = (counts[item.state] ?? 0) + 1;
      return counts;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <section className="watch-stats" aria-label="Feed summary">
      <Stat icon={<Activity size={18} />} label="Tracked items" value={items.length.toLocaleString()} note="Starter monitoring feed" loading={loading} />
      <Stat icon={<Landmark size={18} />} label="Government / regulation" value={regulationCount.toLocaleString()} note="Federal, state, local" loading={loading} />
      <Stat icon={<Database size={18} />} label="Grid / energy data" value={gridCount.toLocaleString()} note="ISO, EIA, utility signals" loading={loading} />
      <Stat icon={<Newspaper size={18} />} label="News / company" value={newsCount.toLocaleString()} note="Industry and operator signals" loading={loading} />
      <article className="watch-top-states">
        <span>Top states mentioned</span>
        <div>
          {topStates.length ? topStates.map(([state, count]) => <b key={state}>{state}<small>{count}</small></b>) : <em>No state tags yet</em>}
        </div>
      </article>
    </section>
  );
}

function Stat({ icon, label, value, note, loading }) {
  return (
    <article>
      <i>{icon}</i>
      <span>{label}</span>
      <strong className={loading ? "stat-loading" : ""}>{loading ? "–" : value}</strong>
      <small>{note}</small>
    </article>
  );
}
