import { Search } from "lucide-react";
import { DATA_CENTER_SOURCE_CATEGORIES } from "../data/dataCenterSources.js";

export default function DataCenterWatchFilters({
  filters,
  sourceTypes,
  states,
  tags,
  onChange,
  onReset,
  resultCount
}) {
  return (
    <section className="watch-filters" aria-label="Feed filters">
      <label className="watch-search">
        <Search size={17} />
        <input
          type="search"
          value={filters.query}
          placeholder="Search source, company, utility, city, or topic..."
          onChange={(event) => onChange({ query: event.target.value })}
        />
      </label>
      <label>
        <span>Source type</span>
        <select value={filters.sourceType} onChange={(event) => onChange({ sourceType: event.target.value })}>
          <option value="all">All sources</option>
          {sourceTypes.map((type) => <option key={type} value={type}>{DATA_CENTER_SOURCE_CATEGORIES[type] ?? type}</option>)}
        </select>
      </label>
      <label>
        <span>State</span>
        <select value={filters.state} onChange={(event) => onChange({ state: event.target.value })}>
          <option value="all">All states</option>
          {states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
      <label>
        <span>Topic tag</span>
        <select value={filters.tag} onChange={(event) => onChange({ tag: event.target.value })}>
          <option value="all">All topics</option>
          {tags.map((tag) => <option key={tag} value={tag}>{tag.replaceAll("_", " ")}</option>)}
        </select>
      </label>
      <label>
        <span>Sort by</span>
        <select value={filters.sortBy} onChange={(event) => onChange({ sortBy: event.target.value })}>
          <option value="newest">Newest</option>
          <option value="importance">Importance</option>
          <option value="state">State</option>
          <option value="sourceType">Source type</option>
        </select>
      </label>
      <div className="watch-filter-summary">
        <strong>{resultCount.toLocaleString()}</strong>
        <span>{resultCount === 1 ? "item" : "items"} shown</span>
        <button type="button" onClick={onReset}>Reset</button>
      </div>
    </section>
  );
}
