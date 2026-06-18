import { useMemo, useState } from "react";
import { Server, Zap } from "lucide-react";

export default function SearchPanel({ icon, items, loading, onSelect }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return items
      .filter((item) => `${item.name} ${item.subtitle}`.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [items, query]);

  return (
    <div className="search-panel">
      <div className="search-input">
        {icon}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={loading ? "Loading national infrastructure..." : "Search a plant, operator, city, or state..."}
          aria-label="Search infrastructure"
        />
        <kbd>Ctrl K</kbd>
      </div>

      {query.trim().length >= 2 && (
        <div className="search-results floating-panel">
          {results.length ? results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
              }}
            >
              <i>{item.type === "power_plant" ? <Zap size={15} /> : <Server size={15} />}</i>
              <span><strong>{item.name}</strong><small>{item.subtitle}</small></span>
            </button>
          )) : <p>No matching infrastructure found.</p>}
        </div>
      )}
    </div>
  );
}
