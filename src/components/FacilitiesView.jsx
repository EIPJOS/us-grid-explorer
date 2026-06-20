import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Search, Server, Zap } from "lucide-react";

const PAGE_SIZE = 50;

export default function FacilitiesView({ plants, dataCenters, loading, loadError, onViewOnMap }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [fuel, setFuel] = useState("all");
  const [stateCode, setStateCode] = useState("all");
  const [page, setPage] = useState(0);

  const records = useMemo(() => {
    const plantRecords = plants.map((feature) => ({
      id: feature.id,
      type: "power_plant",
      name: feature.name,
      operator: feature.properties.utilityName,
      state: feature.properties.state,
      city: feature.properties.city,
      category: feature.properties.primaryFuel,
      capacity: feature.properties.operatingCapacityMw,
      feature
    }));
    const centerRecords = dataCenters.map((feature) => ({
      id: feature.id,
      type: "data_center",
      name: feature.name,
      operator: feature.properties.operator,
      state: feature.properties.state,
      city: feature.properties.city,
      category: "data_center",
      capacity: null,
      feature
    }));
    return [...centerRecords, ...plantRecords];
  }, [plants, dataCenters]);

  const states = useMemo(() => [...new Set(records.map((record) => record.state).filter(Boolean))].sort(), [records]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const queryMatch = !normalized || `${record.name} ${record.operator} ${record.city} ${record.state}`.toLowerCase().includes(normalized);
      const typeMatch = type === "all" || record.type === type;
      const fuelMatch = fuel === "all" || record.category === fuel;
      const stateMatch = stateCode === "all" || record.state === stateCode;
      return queryMatch && typeMatch && fuelMatch && stateMatch;
    });
  }, [records, query, type, fuel, stateCode]);

  useEffect(() => setPage(0), [query, type, fuel, stateCode]);
  useEffect(() => {
    if (type === "data_center") setFuel("all");
  }, [type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <main className="view-shell facilities-view">
      <section className="view-heading">
        <div>
          <span className="eyebrow">National infrastructure directory</span>
          <h1>Facilities</h1>
          <p>Search reported power plants and data centers, inspect source coverage, and jump directly to the map.</p>
        </div>
        <div className="view-metrics">
          <Metric icon={<Zap size={17} />} label="Power plants" value={plants.length.toLocaleString()} />
          <Metric icon={<Server size={17} />} label="Community locations" value={dataCenters.length.toLocaleString()} />
          <Metric icon={<MapPin size={17} />} label="Visible results" value={filtered.length.toLocaleString()} />
        </div>
      </section>

      <section className="directory-panel">
        <div className="directory-toolbar">
          <label className="directory-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, operator, city, or state..." /></label>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All facility types</option>
            <option value="power_plant">Power plants</option>
            <option value="data_center">Data centers</option>
          </select>
          <select value={stateCode} onChange={(event) => setStateCode(event.target.value)}>
            <option value="all">All states</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          <select value={fuel} onChange={(event) => setFuel(event.target.value)} disabled={type === "data_center"}>
            <option value="all">All fuels</option>
            {["oil_gas", "coal", "nuclear", "wind", "solar", "hydro", "storage", "biomass", "geothermal", "other"].map((value) => (
              <option key={value} value={value}>{formatLabel(value)}</option>
            ))}
          </select>
        </div>

        {loadError && <div className="view-error">{loadError}</div>}
        {loading ? <div className="table-state">Loading national facility records...</div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Facility</th><th>Type</th><th>Operator / utility</th><th>Location</th><th>Capacity</th><th></th></tr></thead>
              <tbody>
                {visible.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.name}</strong><small>{formatLabel(record.category)}</small></td>
                    <td><span className={`type-pill ${record.type}`}>{record.type === "power_plant" ? <Zap size={13} /> : <Server size={13} />}{formatLabel(record.type)}</span></td>
                    <td>{record.operator || "Not reported"}</td>
                    <td>{[record.city, record.state].filter(Boolean).join(", ") || "Location only"}</td>
                    <td>{record.capacity == null ? "Not reported" : `${record.capacity.toLocaleString()} MW`}</td>
                    <td><button className="map-link" onClick={() => onViewOnMap({ type: record.type, feature: record.feature })}><MapPin size={14} />Map</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <div className="table-state">No facilities match these filters.</div>}
          </div>
        )}

        <div className="pagination">
          <span>{filtered.length ? `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length.toLocaleString()}` : "0 results"}</span>
          <div><button disabled={page === 0} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><b>Page {page + 1} of {pageCount}</b><button disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div>
        </div>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return <div className="view-metric"><i>{icon}</i><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function formatLabel(value) {
  if (value === "other") return "Industrial & other";
  return String(value ?? "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
