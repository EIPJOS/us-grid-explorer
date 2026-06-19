import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, Check, Copy, Database, LoaderCircle, MapPin, Radio, Search, Server, TowerControl, Zap } from "lucide-react";
import { queryLengthBucket, trackEvent } from "../lib/analytics.js";

const RADII = [25, 50, 100];
const TRANSMISSION_SERVICE = "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query";
const FUEL_LABELS = {
  oil_gas: "Oil & gas", coal: "Coal", nuclear: "Nuclear", wind: "Wind",
  solar: "Solar", hydro: "Hydro", storage: "Storage", biomass: "Biomass",
  geothermal: "Geothermal", other: "Other"
};
const FUEL_COLORS = {
  oil_gas: "#ff6257", coal: "#8d99ae", nuclear: "#ffd84d", wind: "#86a8ff",
  solar: "#ffbe3d", hydro: "#4cc9f0", storage: "#bd80ff", biomass: "#69e2ae",
  geothermal: "#ff925c", other: "#c0c7d3"
};
const SIGNAL_REGIONS = new Set(["PJM", "ERCO", "MISO", "CISO", "NYIS", "ISNE", "SWPP"]);

export default function AreaReportView({ plants, dataCenters, loading, loadError, initialArea, onSearchPlace, onOpenMap }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState(initialArea);
  const [radius, setRadius] = useState(50);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [transmission, setTransmission] = useState({ loading: false, count: null, error: "" });
  const [stateAnalysis, setStateAnalysis] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/data/state-analysis.json")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`State analysis returned ${response.status}`)))
      .then(setStateAnalysis)
      .catch(() => setStateAnalysis({ states: [] }));
  }, []);

  useEffect(() => {
    if (!area) return;
    let active = true;
    const controller = new AbortController();
    setTransmission({ loading: true, count: null, error: "" });
    fetch(buildTransmissionUrl(area, radius), { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Transmission service returned ${response.status}`)))
      .then((payload) => {
        if (active) setTransmission({ loading: false, count: Number(payload.count) || 0, error: "" });
      })
      .catch((error) => {
        if (active && error.name !== "AbortError") setTransmission({ loading: false, count: null, error: error.message });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [area, radius]);

  const nearby = useMemo(() => {
    if (!area) return { plants: [], centers: [] };
    return {
      plants: plants.map((feature) => withDistance(feature, area)).filter((record) => record.distance <= radius).sort(byDistance),
      centers: dataCenters.map((feature) => withDistance(feature, area)).filter((record) => record.distance <= radius).sort(byDistance)
    };
  }, [area, radius, plants, dataCenters]);

  const state = stateAnalysis?.states?.find((entry) => entry.state === area?.state) ?? null;
  const localCapacity = nearby.plants.reduce((sum, record) => sum + (record.feature.properties.operatingCapacityMw || 0), 0);
  const localFuel = useMemo(() => aggregateFuel(nearby.plants.map((record) => record.feature)), [nearby.plants]);
  const authority = useMemo(() => dominantAuthority(nearby.plants), [nearby.plants]);

  async function submitSearch(event) {
    event?.preventDefault();
    const value = query.trim();
    if (value.length < 2 || searching || loading) return;
    setSearching(true);
    setSearchError("");
    trackEvent("Place Search Submitted", { query_length: queryLengthBucket(value) });
    try {
      const results = await onSearchPlace(value);
      trackEvent("Place Search Completed", { result_count: results.length, outcome: results.length ? "results" : "empty" });
      if (!results.length) {
        setSearchError("No U.S. location matched that search.");
        return;
      }
      const nextArea = areaFromPlace(results[0]);
      setArea(nextArea);
      setQuery("");
      setCopied(false);
      updateAreaUrl(nextArea);
      trackEvent("Area Report Generated", { result_type: nextArea.type, state: nextArea.state || "unknown", has_zip: Boolean(nextArea.postalCode) });
    } catch (error) {
      setSearchError(error.message);
      trackEvent("Place Search Completed", { result_count: 0, outcome: "error" });
    } finally {
      setSearching(false);
    }
  }

  function changeRadius(nextRadius) {
    setRadius(nextRadius);
    trackEvent("Area Radius Changed", { radius_miles: nextRadius });
  }

  async function shareReport() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      trackEvent("Area Report Shared", { state: area?.state || "unknown" });
    } catch {
      setCopied(false);
    }
  }

  function openMap() {
    trackEvent("Area Opened On Map", { state: area?.state || "unknown" });
    onOpenMap(area);
  }

  return (
    <main className="view-shell area-view">
      <section className="area-heading">
        <div>
          <span className="eyebrow">Local infrastructure report</span>
          <h1>What powers my area?</h1>
          <p>Find nearby generation, community-mapped data centers, transmission context, and finalized state capacity data.</p>
        </div>
        <form className="area-search" onSubmit={submitSearch}>
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="City, ZIP code, or address" aria-label="Search a U.S. location" />
          <button type="submit" disabled={searching || loading || query.trim().length < 2}>{searching || loading ? <LoaderCircle className="spinning" size={17} /> : "Build report"}</button>
        </form>
      </section>

      {searchError && <div className="area-error">{searchError}</div>}
      {loadError && <div className="area-error">Infrastructure data could not load: {loadError}</div>}

      {!area ? (
        <section className="area-empty">
          <div><MapPin size={27} /></div>
          <h2>Start with a place</h2>
          <p>{loading ? "Loading national infrastructure records..." : "Search a city, ZIP code, or address. Exact search text is sent only to the geocoding service and is not added to analytics or the share URL."}</p>
          <div className="area-examples">
            {[["Ashburn, VA", "Ashburn, VA"], ["Phoenix, AZ", "Phoenix, AZ"], ["60601", "Chicago ZIP 60601"]].map(([value, label]) => <button key={value} onClick={() => setQuery(value)}>{label}<ArrowRight size={14} /></button>)}
          </div>
        </section>
      ) : (
        <>
          <section className="area-report-header">
            <div>
              <span className="eyebrow">Matched area</span>
              <h2>{area.label}</h2>
              <p>Nearby means straight-line distance from an approximate geocoded point. It does not mean a facility directly serves this location.</p>
            </div>
            <div className="area-actions">
              <button onClick={shareReport}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy link"}</button>
              <button className="primary" onClick={openMap}><MapPin size={15} />Open on map</button>
            </div>
          </section>

          <section className="area-radius" aria-label="Search radius">
            <span>Search radius</span>
            <div>{RADII.map((miles) => <button key={miles} className={radius === miles ? "active" : ""} onClick={() => changeRadius(miles)}>{miles} miles</button>)}</div>
          </section>

          <section className="area-metrics">
            <AreaMetric icon={<Zap size={17} />} label="Power plants" value={nearby.plants.length.toLocaleString()} note={`within ${radius} miles`} />
            <AreaMetric icon={<Activity size={17} />} label="Operating capacity nearby" value={`${Math.round(localCapacity).toLocaleString()} MW`} note="Nameplate capacity, not generation" />
            <AreaMetric icon={<Server size={17} />} label="Community-mapped locations" value={nearby.centers.length.toLocaleString()} note="Incomplete OpenStreetMap coverage" />
            <AreaMetric icon={<TowerControl size={17} />} label="Transmission segments" value={transmission.loading ? "..." : transmission.count == null ? "Unavailable" : transmission.count.toLocaleString()} note="Intersecting approximate search area" />
          </section>

          <section className="area-grid">
            <article className="area-card nearby-card">
              <CardHeading icon={<Zap size={16} />} title="Nearest power plants" note={`${nearby.plants.length.toLocaleString()} found`} />
              <NearbyList records={nearby.plants.slice(0, 6)} type="plant" empty="No reported power plants within this radius." />
            </article>
            <article className="area-card nearby-card">
              <CardHeading icon={<Server size={16} />} title="Nearest community locations" note={`${nearby.centers.length.toLocaleString()} found`} />
              <NearbyList records={nearby.centers.slice(0, 6)} type="center" empty="No community-mapped data centers within this radius." />
            </article>
            <article className="area-card fuel-summary">
              <CardHeading icon={<Activity size={16} />} title="Nearby capacity mix" note="Preliminary facility records" />
              <FuelBars fuels={localFuel} total={localCapacity} />
              <p>Nearby capacity describes located equipment, not the electricity delivered to this area.</p>
            </article>
            <article className="area-card fuel-summary">
              <CardHeading icon={<Database size={16} />} title={`${area.state || "State"} capacity mix`} note="Final EIA-860 2024" />
              <FuelBars fuels={state ? fuelEntries(state.capacityByFuelMw) : []} total={state?.operatingCapacityMw ?? 0} />
              {!state && <p>Finalized state analysis is unavailable for this location.</p>}
            </article>
          </section>

          <section className="area-context">
            <div><Radio size={18} /><span><small>Nearby reported grid context</small><strong>{authority ? authority.name : "No balancing authority reported nearby"}</strong><p>{authority ? `${authority.count.toLocaleString()} nearby plants report this balancing authority. This is not a service-territory determination.` : "Increase the radius to look for reported plant context."}</p></span></div>
            {authority && SIGNAL_REGIONS.has(authority.code) && <a href={`/?view=signals&region=${authority.code}`}>View regional demand <ArrowRight size={14} /></a>}
          </section>

          <section className="area-method">
            <strong>Report limits</strong>
            <p>Plant records are preliminary EIA-860 2025 facility data. State mix is finalized EIA-860 2024 capacity. Data centers are incomplete community records. Transmission is an approximate count of line segments intersecting a bounding area. Distances are straight-line estimates.</p>
            <a href="/methodology/">Read full methodology</a>
          </section>
        </>
      )}
    </main>
  );
}

function AreaMetric({ icon, label, value, note }) {
  return <article><i>{icon}</i><span><small>{label}</small><strong>{value}</strong><em>{note}</em></span></article>;
}

function CardHeading({ icon, title, note }) {
  return <header><span>{icon}{title}</span><small>{note}</small></header>;
}

function NearbyList({ records, type, empty }) {
  if (!records.length) return <div className="nearby-empty">{empty}</div>;
  return <ol>{records.map(({ feature, distance }) => <li key={feature.id}><span><strong>{feature.name}</strong><small>{type === "plant" ? `${FUEL_LABELS[feature.properties.primaryFuel] ?? "Other"} - ${Math.round(feature.properties.operatingCapacityMw).toLocaleString()} MW` : feature.properties.operator || "Operator not reported"}</small></span><b>{distance.toFixed(1)} mi</b></li>)}</ol>;
}

function FuelBars({ fuels, total }) {
  if (!fuels.length || !total) return <div className="nearby-empty">No capacity records are available for this view.</div>;
  return <div className="area-fuels">{fuels.slice(0, 6).map((fuel) => <div key={fuel.key}><span><i style={{ background: FUEL_COLORS[fuel.key] ?? FUEL_COLORS.other }}></i><strong>{FUEL_LABELS[fuel.key] ?? fuel.key}</strong><small>{percent(fuel.value, total)}%</small><b>{Math.round(fuel.value).toLocaleString()} MW</b></span><em><i style={{ width: `${percent(fuel.value, total)}%`, background: FUEL_COLORS[fuel.key] ?? FUEL_COLORS.other }}></i></em></div>)}</div>;
}

function areaFromPlace(place) {
  const attributes = place.attributes ?? {};
  const city = attributes.City || "";
  const state = attributes.RegionAbbr || "";
  const postalCode = attributes.Postal || "";
  const label = city && state ? `${city}, ${state}` : postalCode ? `ZIP ${postalCode}${state ? `, ${state}` : ""}` : state || "Selected U.S. area";
  return {
    label,
    city,
    state,
    postalCode,
    type: attributes.Addr_type || "place",
    score: Math.round(place.score || 0),
    longitude: Number(place.location.x),
    latitude: Number(place.location.y)
  };
}

function updateAreaUrl(area) {
  const params = new URLSearchParams();
  params.set("view", "area");
  params.set("lat", area.latitude.toFixed(2));
  params.set("lng", area.longitude.toFixed(2));
  params.set("label", area.label);
  if (area.state) params.set("state", area.state);
  if (area.postalCode) params.set("zip", area.postalCode);
  params.set("type", area.type);
  window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
}

function withDistance(feature, area) {
  const [longitude, latitude] = feature.geometry.coordinates;
  return { feature, distance: distanceMiles(area.latitude, area.longitude, latitude, longitude) };
}

function byDistance(a, b) {
  return a.distance - b.distance;
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function aggregateFuel(plants) {
  const totals = {};
  plants.forEach((plant) => Object.entries(plant.properties.capacityByFuelMw ?? {}).forEach(([fuel, value]) => {
    totals[fuel] = (totals[fuel] ?? 0) + Number(value || 0);
  }));
  return fuelEntries(totals);
}

function fuelEntries(values) {
  return Object.entries(values ?? {}).map(([key, value]) => ({ key, value: Number(value) })).filter((fuel) => fuel.value > 0).sort((a, b) => b.value - a.value);
}

function dominantAuthority(plants) {
  const counts = {};
  plants.forEach(({ feature }) => {
    const code = feature.properties.balancingAuthorityCode;
    if (!code) return;
    const current = counts[code] ?? { code, name: feature.properties.balancingAuthorityName || code, count: 0 };
    current.count += 1;
    counts[code] = current;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count)[0] ?? null;
}

function buildTransmissionUrl(area, radius) {
  const latDelta = radius / 69;
  const lonDelta = radius / Math.max(20, 69 * Math.cos(area.latitude * Math.PI / 180));
  const url = new URL(TRANSMISSION_SERVICE);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("geometry", [area.longitude - lonDelta, area.latitude - latDelta, area.longitude + lonDelta, area.latitude + latDelta].join(","));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("returnCountOnly", "true");
  url.searchParams.set("f", "json");
  return url.toString();
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}
