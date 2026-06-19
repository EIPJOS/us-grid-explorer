import { useMemo, useState } from "react";
import { LoaderCircle, MapPin, Search, Server, Zap } from "lucide-react";
import { queryLengthBucket, trackEvent } from "../lib/analytics.js";

export default function SearchPanel({
  icon,
  items,
  loading,
  onSelect,
  onSearchPlace,
  onSelectPlace
}) {
  const [query, setQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return items
      .filter((item) => `${item.name} ${item.subtitle}`.toLowerCase().includes(normalized))
      .slice(0, 7);
  }, [items, query]);

  async function submitPlaceSearch() {
    const value = query.trim();
    if (value.length < 2 || placeLoading) return;
    trackEvent("Place Search Submitted", { query_length: queryLengthBucket(value) });
    setPlaceLoading(true);
    setPlaceError("");
    try {
      const nextResults = await onSearchPlace(value);
      setPlaceResults(nextResults);
      trackEvent("Place Search Completed", { result_count: nextResults.length, outcome: nextResults.length ? "results" : "empty" });
    } catch (error) {
      setPlaceResults([]);
      setPlaceError(error.message);
      trackEvent("Place Search Completed", { result_count: 0, outcome: "error" });
    } finally {
      setPlaceLoading(false);
    }
  }

  function updateQuery(value) {
    setQuery(value);
    setPlaceResults([]);
    setPlaceError("");
  }

  const isOpen = query.trim().length >= 2;

  return (
    <div className="search-panel">
      <div className="search-input">
        {icon}
        <input
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitPlaceSearch();
          }}
          placeholder={loading ? "Loading national infrastructure..." : "Search facilities, cities, addresses, or ZIP codes..."}
          aria-label="Search infrastructure and places"
        />
        <kbd>Enter</kbd>
      </div>

      {isOpen && (
        <div className="search-results floating-panel">
          {results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => {
                onSelect(item);
                setQuery(item.name);
                setPlaceResults([]);
              }}
            >
              <i>{item.type === "power_plant" ? <Zap size={15} /> : <Server size={15} />}</i>
              <span><strong>{item.name}</strong><small>{item.subtitle}</small></span>
            </button>
          ))}

          {placeResults.map((place) => (
            <button
              key={`${place.address}-${place.location.x}-${place.location.y}`}
              onClick={() => {
                onSelectPlace(place);
                setQuery(place.address);
                setPlaceResults([]);
              }}
            >
              <i className="place-icon"><MapPin size={15} /></i>
              <span><strong>{place.address}</strong><small>{place.attributes.Addr_type} - {Math.round(place.score)}% match</small></span>
            </button>
          ))}

          <button className="place-search-action" onClick={submitPlaceSearch} disabled={placeLoading}>
            <i className="place-icon">{placeLoading ? <LoaderCircle size={15} className="spinning" /> : <Search size={15} />}</i>
            <span><strong>{placeLoading ? "Searching places..." : `Search places for "${query.trim()}"`}</strong><small>City, address, or ZIP code</small></span>
          </button>

          {!results.length && !placeResults.length && !placeLoading && !placeError && (
            <p>No facility match. Press Enter to search U.S. places.</p>
          )}
          {placeError && <p className="search-error">{placeError}</p>}
        </div>
      )}
    </div>
  );
}
