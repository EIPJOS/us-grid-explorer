import { useMemo, useState } from "react";
import { Bell, Library, ListFilter } from "lucide-react";
import DataCenterSourceLibrary from "./DataCenterSourceLibrary.jsx";
import DataCenterWatchCard from "./DataCenterWatchCard.jsx";
import DataCenterWatchFilters from "./DataCenterWatchFilters.jsx";
import DataCenterWatchStats from "./DataCenterWatchStats.jsx";
import { dataCenterSources } from "../data/dataCenterSources.js";
import { dataCenterWatchItems } from "../data/dataCenterWatchItems.js";

const DEFAULT_FILTERS = {
  query: "",
  sourceType: "all",
  state: "all",
  tag: "all",
  sortBy: "newest"
};

export default function DataCenterWatchView() {
  const [activeTab, setActiveTab] = useState("watch");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const options = useMemo(() => ({
    sourceTypes: unique(dataCenterWatchItems.map((item) => item.sourceType)),
    states: unique(dataCenterWatchItems.map((item) => item.state).filter(Boolean)),
    tags: unique(dataCenterWatchItems.flatMap((item) => item.tags))
  }), []);

  const filteredItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return dataCenterWatchItems
      .filter((item) => {
        if (filters.sourceType !== "all" && item.sourceType !== filters.sourceType) return false;
        if (filters.state !== "all" && item.state !== filters.state) return false;
        if (filters.tag !== "all" && !item.tags.includes(filters.tag)) return false;
        if (!query) return true;
        return searchableText(item).includes(query);
      })
      .sort((a, b) => sortItems(a, b, filters.sortBy));
  }, [filters]);

  function updateFilters(next) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <main className="view-shell data-watch-view">
      <section className="watch-hero">
        <div>
          <p className="eyebrow">Data center growth monitor</p>
          <h1>Data Center Watch</h1>
          <p>Tracking how AI and data center growth affects the U.S. power grid, regulation, and infrastructure investment.</p>
          <div className="data-status">
            <span className="preliminary">Mock feed for API wiring</span>
            <span className="final">Sourced links only</span>
            <span className="community">No full article scraping</span>
          </div>
        </div>
        <aside>
          <span>Highest-priority signal</span>
          <strong>{dataCenterWatchItems[0].importanceScore}</strong>
          <small>{dataCenterWatchItems[0].title}</small>
        </aside>
      </section>

      <div className="watch-tabs" role="tablist" aria-label="Data Center Watch sections">
        <button className={activeTab === "watch" ? "active" : ""} onClick={() => setActiveTab("watch")}><Bell size={16} /> Watch feed</button>
        <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")}><Library size={16} /> Source Library</button>
      </div>

      {activeTab === "watch" ? (
        <>
          <DataCenterWatchStats items={dataCenterWatchItems} />
          <DataCenterWatchFilters
            filters={filters}
            sourceTypes={options.sourceTypes}
            states={options.states}
            tags={options.tags}
            onChange={updateFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            resultCount={filteredItems.length}
          />
          <section className="watch-list-wrap">
            <div className="watch-section-heading">
              <div>
                <p className="eyebrow">Monitoring queue</p>
                <h2>Signals to verify and expand</h2>
              </div>
              <span><ListFilter size={14} /> Sorted by {filters.sortBy.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
            </div>
            {filteredItems.length ? (
              <div className="watch-list">
                {filteredItems.map((item) => <DataCenterWatchCard key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="watch-empty">
                <h2>No watch items match these filters</h2>
                <p>Try clearing the search or selecting a broader source type, state, or topic tag.</p>
                <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset filters</button>
              </div>
            )}
          </section>
        </>
      ) : (
        <DataCenterSourceLibrary sources={dataCenterSources} />
      )}
    </main>
  );
}

function unique(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function searchableText(item) {
  return [
    item.title,
    item.sourceName,
    item.sourceType,
    item.state,
    item.county,
    item.city,
    item.agency,
    item.isoRto,
    item.summary,
    ...(item.companyNames ?? []),
    ...(item.utilityNames ?? []),
    ...item.tags
  ].filter(Boolean).join(" ").toLowerCase();
}

function sortItems(a, b, sortBy) {
  if (sortBy === "importance") return b.importanceScore - a.importanceScore;
  if (sortBy === "state") return (a.state ?? "ZZ").localeCompare(b.state ?? "ZZ") || b.importanceScore - a.importanceScore;
  if (sortBy === "sourceType") return a.sourceType.localeCompare(b.sourceType) || b.importanceScore - a.importanceScore;
  return new Date(b.publishedDate ?? b.createdAt) - new Date(a.publishedDate ?? a.createdAt);
}
