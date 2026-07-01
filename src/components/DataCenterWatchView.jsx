import { useEffect, useMemo, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("briefings");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [refreshTick, setRefreshTick] = useState(0);
  const [liveFeed, setLiveFeed] = useState({
    status: "loading",
    mode: "fallback",
    source: "Curated starter dataset",
    fetchedAt: null,
    items: dataCenterWatchItems,
    message: ""
  });

  useEffect(() => {
    let active = true;
    fetch("/api/data-center-watch?limit=18")
      .then((response) => {
        if (!response.ok) throw new Error(`Data Center Watch API returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        if (!Array.isArray(payload.items) || payload.items.length === 0) throw new Error("No live Federal Register items returned.");
        setLiveFeed({
          status: "live",
          mode: payload.mode ?? "live",
          source: payload.source ?? "Federal Register",
          fetchedAt: payload.fetchedAt ?? null,
          items: payload.items,
          message: ""
        });
      })
      .catch((error) => {
        if (!active) return;
        const rawMessage = error instanceof Error ? error.message : "Live feed unavailable.";
        setLiveFeed({
          status: "fallback",
          mode: "fallback",
          source: "Curated starter dataset",
          fetchedAt: null,
          items: dataCenterWatchItems,
          message: cleanFeedError(rawMessage)
        });
      });

    return () => {
      active = false;
    };
  }, [refreshTick]);

  const watchItems = activeTab === "notices" ? liveFeed.items : dataCenterWatchItems;

  const options = useMemo(() => ({
    sourceTypes: unique(watchItems.map((item) => item.sourceType)),
    states: unique(watchItems.map((item) => item.state).filter(Boolean)),
    tags: unique(watchItems.flatMap((item) => item.tags))
  }), [watchItems]);

  const filteredItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return watchItems
      .filter((item) => {
        if (filters.sourceType !== "all" && item.sourceType !== filters.sourceType) return false;
        if (filters.state !== "all" && item.state !== filters.state) return false;
        if (filters.tag !== "all" && !item.tags.includes(filters.tag)) return false;
        if (!query) return true;
        return searchableText(item).includes(query);
      })
      .sort((a, b) => sortItems(a, b, filters.sortBy));
  }, [filters, watchItems]);

  function updateFilters(next) {
    setFilters((current) => ({ ...current, ...next }));
  }

  return (
    <main className="view-shell data-watch-view">
      <section className="view-heading">
        <div>
          <p className="eyebrow">Data center construction and grid intelligence</p>
          <h1>Feeds</h1>
          <p>Verified developments in U.S. data center construction, power demand, utility planning, and permitting.</p>
        </div>
        <div className="signal-status">
          <span><i></i>{liveFeed.status === "live" ? "Primary feed connected" : "Using curated source set"}</span>
          <small>{liveFeed.fetchedAt ? `Updated ${formatDate(liveFeed.fetchedAt)}` : "Updated Jul 1"}</small>
          <button onClick={() => setRefreshTick((current) => current + 1)}>Refresh</button>
        </div>
      </section>

      <div className="watch-tabs" role="tablist" aria-label="Feed sections">
        <button className={activeTab === "briefings" ? "active" : ""} onClick={() => setActiveTab("briefings")}><Bell size={16} /> Briefings</button>
        <button className={activeTab === "notices" ? "active" : ""} onClick={() => setActiveTab("notices")}><ListFilter size={16} /> Live notices</button>
        <button className={activeTab === "sources" ? "active" : ""} onClick={() => setActiveTab("sources")}><Library size={16} /> Source Library</button>
      </div>

      {activeTab !== "sources" ? (
        <>
          <DataCenterWatchStats items={watchItems} />
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
                <p className="eyebrow">{activeTab === "briefings" ? "Editor-reviewed" : "Automated monitoring"}</p>
                <h2>{activeTab === "briefings" ? "Latest briefings" : "Federal Register notices"}</h2>
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
    item.whyItMatters,
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

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function cleanFeedError(message) {
  if (/json|unexpected token|returned 404|returned 502/i.test(message)) {
    return "live Federal Register feed is unavailable in this environment.";
  }
  return message;
}
