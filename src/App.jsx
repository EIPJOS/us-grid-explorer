import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, BookOpen, Database, Map, MapPinned, Newspaper, Radio, Search, ShieldCheck, Zap } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
import ExploreMap from "./components/ExploreMap.jsx";
import LayerPanel from "./components/LayerPanel.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import SelectionPanel from "./components/SelectionPanel.jsx";
import FacilitiesView from "./components/FacilitiesView.jsx";
import GridGuide from "./components/GridGuide.jsx";
import { analyticsEnabled, trackEvent } from "./lib/analytics.js";

const GridSignalsView = lazy(() => import("./components/GridSignalsView.jsx"));
const AnalysisView = lazy(() => import("./components/AnalysisView.jsx"));
const LearnView = lazy(() => import("./components/LearnView.jsx"));
const AreaReportView = lazy(() => import("./components/AreaReportView.jsx"));
const DataCenterWatchView = lazy(() => import("./components/DataCenterWatchView.jsx"));

const INITIAL_FUEL_VISIBILITY = {
  oil_gas: true,
  coal: true,
  nuclear: true,
  wind: false,
  solar: false,
  hydro: false,
  storage: false,
  biomass: false,
  geothermal: false,
  other: false
};

const INITIAL_PLANT_STATUS_VISIBILITY = {
  operating: true,
  proposed: false
};

const STATIC_SOURCES = {
  "national-transmission-lines": {
    publisher: "ArcGIS public infrastructure service",
    dataset: "Electric Power Transmission Lines",
    url: "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0",
    checkedAt: "2026-06-18",
    confidence: "reported",
    cadence: "periodic",
    note: "National line segments are queried by visible map area. Voltage and ownership fields may be missing or inferred."
  },
  "hifld-substations-2025": {
    publisher: "HIFLD / Oak Ridge National Laboratory and partner agencies",
    dataset: "HIFLD Substations 1/9/2025",
    url: "https://www.arcgis.com/home/item.html?id=83397b209bfb4007a2f4c00e70df8e5d",
    checkedAt: "2026-06-18",
    confidence: "reported",
    cadence: "periodic",
    note: "National transmission-associated substations, primarily 69 kV and above. Lower-voltage coverage is not complete."
  },
  "arcgis-world-geocoder": {
    publisher: "Esri",
    dataset: "ArcGIS World Geocoding Service",
    url: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
    checkedAt: "2026-06-18",
    confidence: "reported",
    cadence: "live",
    note: "Geographic search results are returned by the ArcGIS geocoder and may be approximate."
  }
};

export default function App() {
  const initialParams = new URLSearchParams(window.location.search);
  const routePath = window.location.pathname.replace(/^\/|\/$/g, "");
  const initialView = routePath === "data-center-watch"
    ? "data_center_watch"
    : initialParams.get("view");
  const initialArea = parseInitialArea(initialParams);
  const initialRegion = initialParams.get("region")?.toUpperCase();
  const initialPlantCode = Number(initialParams.get("plant"));
  const initialStates = (initialParams.get("states") ?? initialParams.get("state") ?? "")
    .split(",")
    .map((state) => state.trim().toUpperCase())
    .filter(Boolean);
  const [activeView, setActiveView] = useState(
    ["explore", "area", "facilities", "signals", "analysis", "learn", "data_center_watch"].includes(initialView) ? initialView : "explore"
  );
  const [tourOpen, setTourOpen] = useState(false);
  const [plantPayload, setPlantPayload] = useState(null);
  const [dataCenterPayload, setDataCenterPayload] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [viewportBounds, setViewportBounds] = useState(null);
  const [showDataCenters, setShowDataCenters] = useState(true);
  const [showPowerPlants, setShowPowerPlants] = useState(true);
  const [showTransmission, setShowTransmission] = useState(false);
  const [showSubstations, setShowSubstations] = useState(false);
  const [fuelVisibility, setFuelVisibility] = useState(INITIAL_FUEL_VISIBILITY);
  const [plantStatusVisibility, setPlantStatusVisibility] = useState(INITIAL_PLANT_STATUS_VISIBILITY);
  const hasChosenFuel = useRef(false);
  const initialPlantFocused = useRef(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchLayer("/data/power-plants.json", "Power-plant"),
      fetchLayer("/data/data-centers.json", "Data-center")
    ])
      .then(([plants, centers]) => {
        if (!active) return;
        setPlantPayload(plants);
        setDataCenterPayload(centers);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const plants = plantPayload?.features ?? [];
  const dataCenters = dataCenterPayload?.features ?? [];
  const visiblePlants = useMemo(
    () => viewportBounds ? plants.filter((plant) => isPointInBounds(plant, viewportBounds)) : plants,
    [plants, viewportBounds]
  );
  const visibleStatusPlants = useMemo(
    () => visiblePlants.filter((plant) => isPlantVisibleByStatus(plant, plantStatusVisibility)),
    [visiblePlants, plantStatusVisibility]
  );
  const visibleFuelCounts = useMemo(() => countPlantsByFuel(visibleStatusPlants), [visibleStatusPlants]);
  const visiblePlantStatusCounts = useMemo(() => countPlantsByStatus(visiblePlants), [visiblePlants]);
  const visibleSelectedPlantCount = useMemo(
    () => Object.entries(visibleFuelCounts).reduce(
      (total, [fuel, count]) => total + (fuelVisibility[fuel] ? count : 0),
      0
    ),
    [visibleFuelCounts, fuelVisibility]
  );
  const nationalFuelCounts = useMemo(() => countPlantsByFuel(plants), [plants]);

  const searchItems = useMemo(() => {
    const plantItems = plants.map((plant) => ({
      id: plant.id,
      type: "power_plant",
      name: plant.name,
      subtitle: `${plant.properties.city}, ${plant.properties.state}`,
      coordinates: plant.geometry.coordinates,
      feature: plant
    }));
    const centerItems = dataCenters.map((center) => ({
      id: center.id,
      type: "data_center",
      name: center.name,
      subtitle: dataCenterSubtitle(center),
      coordinates: center.geometry.coordinates,
      feature: center
    }));
    return [...centerItems, ...plantItems];
  }, [plants, dataCenters]);

  const sourceRegistry = useMemo(() => ({
    ...STATIC_SOURCES,
    ...(plantPayload?.meta?.sources ?? {}),
    ...(dataCenterPayload?.meta?.sources ?? {})
  }), [plantPayload, dataCenterPayload]);

  useEffect(() => {
    if (initialPlantFocused.current || !Number.isInteger(initialPlantCode) || !plants.length) return;
    initialPlantFocused.current = true;
    const plant = plants.find((candidate) => candidate.properties.plantCode === initialPlantCode);
    if (!plant) return;
    setShowPowerPlants(true);
    setFuelVisibility((current) => ({ ...current, [plant.properties.primaryFuel]: true }));
    if (plant.properties.proposedCapacityMw > 0) {
      setPlantStatusVisibility((current) => ({ ...current, proposed: true }));
    }
    setSelectedFeature({ type: "power_plant", feature: plant });
    setFocusRequest({ coordinates: plant.geometry.coordinates, id: plant.id, nonce: Date.now() });
  }, [initialPlantCode, plants]);

  function selectFromSearch(item) {
    trackEvent("Facility Search Selected", { feature_type: item.type });
    setSelectedFeature({ type: item.type, feature: item.feature });
    setFocusRequest({ coordinates: item.coordinates, id: item.id, nonce: Date.now() });
  }

  function selectPlace(place) {
    const feature = {
      id: `place-${place.location.x}-${place.location.y}`,
      type: "place",
      name: place.address,
      geometry: { type: "Point", coordinates: [place.location.x, place.location.y] },
      properties: {
        addressType: place.attributes.Addr_type,
        city: place.attributes.City,
        state: place.attributes.RegionAbbr,
        postalCode: place.attributes.Postal,
        score: place.score
      },
      sourceRef: "arcgis-world-geocoder"
    };
    trackEvent("Place Selected", { result_type: place.attributes.Addr_type || "unknown" });
    setSelectedFeature({ type: "place", feature });
    setFocusRequest({ coordinates: feature.geometry.coordinates, id: feature.id, nonce: Date.now() });
  }

  function viewFacilityOnMap(selection) {
    const coordinates = selection.feature.geometry.coordinates;
    setSelectedFeature(selection);
    setFocusRequest({ coordinates, id: selection.feature.id, nonce: Date.now() });
    changeView("explore");
  }

  function openAreaOnMap(area) {
    const feature = {
      id: `area-${area.longitude}-${area.latitude}`,
      type: "place",
      name: area.label,
      geometry: { type: "Point", coordinates: [area.longitude, area.latitude] },
      properties: {
        addressType: area.type,
        city: area.city,
        state: area.state,
        postalCode: area.postalCode,
        score: area.score
      },
      sourceRef: "arcgis-world-geocoder"
    };
    setSelectedFeature({ type: "place", feature });
    setFocusRequest({ coordinates: feature.geometry.coordinates, id: feature.id, nonce: Date.now() });
    changeView("explore");
  }

  function toggleFuel(category) {
    if (!hasChosenFuel.current) {
      hasChosenFuel.current = true;
      trackEvent("Fuel Filter Changed", { fuel: category, enabled: true, mode: "isolate" });
      setFuelVisibility(Object.fromEntries(
        Object.keys(INITIAL_FUEL_VISIBILITY).map((fuel) => [fuel, fuel === category])
      ));
      return;
    }
    setFuelVisibility((current) => {
      const enabled = !current[category];
      trackEvent("Fuel Filter Changed", { fuel: category, enabled, mode: "toggle" });
      return { ...current, [category]: enabled };
    });
  }

  function togglePlantStatus(status) {
    setPlantStatusVisibility((current) => {
      const enabledCount = Object.values(current).filter(Boolean).length;
      if (current[status] && enabledCount === 1) return current;
      const enabled = !current[status];
      trackEvent("Plant Status Filter Changed", { status, enabled });
      return { ...current, [status]: enabled };
    });
  }

  function changeView(view) {
    trackEvent("View Changed", { view });
    if (view === "data_center_watch") {
      window.history.pushState(null, "", "/data-center-watch/");
    } else if (window.location.pathname === "/data-center-watch/" || window.location.pathname === "/data-center-watch") {
      window.history.pushState(null, "", view === "explore" ? "/" : `/?view=${view}`);
    }
    setActiveView(view);
  }

  function selectMapFeature(selection) {
    trackEvent("Map Feature Selected", { feature_type: selection.type });
    setSelectedFeature(selection);
  }

  function toggleLayer(layer, setter) {
    setter((current) => {
      const enabled = !current;
      trackEvent("Layer Toggled", { layer, enabled });
      return enabled;
    });
  }

  function startTour() {
    trackEvent("Map Tour Started");
    setTourOpen(true);
  }

  function applyGuideAction(action) {
    if (!action || action.type === "none") return;
    if (action.type === "select_view" && ["explore", "facilities", "signals", "analysis", "learn", "data_center_watch"].includes(action.target)) {
      changeView(action.target);
      return;
    }
    if (action.type === "show_layer") {
      if (action.target === "power_plants") setShowPowerPlants(true);
      if (action.target === "data_centers") setShowDataCenters(true);
      if (action.target === "transmission") setShowTransmission(true);
      if (action.target === "substations") setShowSubstations(true);
      changeView("explore");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="US Grid Explorer home">
          <span className="brand-mark"><Zap size={18} strokeWidth={2.6} /></span>
          <span>
            <strong>US Grid Explorer</strong>
            <small>Infrastructure intelligence</small>
          </span>
        </a>

        <nav aria-label="Primary navigation">
          <button className={activeView === "explore" ? "active" : ""} onClick={() => changeView("explore")}><Map size={16} />Explore</button>
          <button className={activeView === "area" ? "active" : ""} onClick={() => changeView("area")}><MapPinned size={16} />My area</button>
          <button className={activeView === "facilities" ? "active" : ""} onClick={() => changeView("facilities")}><Database size={16} />Facilities</button>
          <button className={activeView === "signals" ? "active" : ""} onClick={() => changeView("signals")}><Radio size={16} />Grid signals</button>
          <button className={activeView === "data_center_watch" ? "active" : ""} onClick={() => changeView("data_center_watch")}><Newspaper size={16} />Feeds</button>
          <button className={activeView === "analysis" ? "active" : ""} onClick={() => changeView("analysis")}><BarChart3 size={16} />Analysis</button>
          <button className={activeView === "learn" ? "active" : ""} onClick={() => changeView("learn")}><BookOpen size={16} />Learn</button>
        </nav>

        <div className="topbar-meta">
          <a className="trust-link" href="/methodology/"><ShieldCheck size={14} />Trust center</a>
          <div className="release-badge">
            <i></i>
            {activeView === "signals" ? "EIA-930 hourly data" : activeView === "data_center_watch" ? "Data center feeds" : activeView === "analysis" ? "EIA-860 2024 final" : activeView === "area" ? "Local infrastructure report" : activeView === "learn" ? "Learning center" : "EIA-860 2025 early release"}
          </div>
        </div>
      </header>

      {activeView === "explore" && (
        <main className="explore-shell">
          <ExploreMap
            plants={plants}
            dataCenters={dataCenters}
            fuelVisibility={fuelVisibility}
            plantStatusVisibility={plantStatusVisibility}
            showPowerPlants={showPowerPlants}
            showDataCenters={showDataCenters}
            showTransmission={showTransmission}
            showSubstations={showSubstations}
            focusRequest={focusRequest}
            onSelect={selectMapFeature}
            onViewportChange={setViewportBounds}
          />

          <SearchPanel
            icon={<Search size={18} />}
            items={searchItems}
            loading={(!plantPayload || !dataCenterPayload) && !loadError}
            onSelect={selectFromSearch}
            onSearchPlace={searchPlaces}
            onSelectPlace={selectPlace}
          />

          <LayerPanel
            plantCount={visibleSelectedPlantCount}
            dataCenterCount={dataCenters.length}
            fuelCounts={visibleFuelCounts}
            fuelVisibility={fuelVisibility}
            plantStatusVisibility={plantStatusVisibility}
            plantStatusCounts={visiblePlantStatusCounts}
            showPowerPlants={showPowerPlants}
            showDataCenters={showDataCenters}
            showTransmission={showTransmission}
            showSubstations={showSubstations}
            onTogglePowerPlants={() => toggleLayer("power_plants", setShowPowerPlants)}
            onToggleDataCenters={() => toggleLayer("data_centers", setShowDataCenters)}
            onToggleTransmission={() => toggleLayer("transmission", setShowTransmission)}
            onToggleSubstations={() => toggleLayer("substations", setShowSubstations)}
            onStartTour={startTour}
            onToggleFuel={toggleFuel}
            onTogglePlantStatus={togglePlantStatus}
            loading={(!plantPayload || !dataCenterPayload) && !loadError}
            loadError={loadError}
          />

          <SelectionPanel
            selection={selectedFeature}
            sourceRegistry={sourceRegistry}
            onClose={() => setSelectedFeature(null)}
          />

          <div className="coverage-note">
            <strong>Coverage</strong>
            <span>Power plants: nationwide</span>
            <span>Data centers: nationwide community reports</span>
          </div>

          {tourOpen && <TourOverlay onClose={() => setTourOpen(false)} />}
        </main>
      )}

      {activeView === "facilities" && (
        <FacilitiesView
          plants={plants}
          dataCenters={dataCenters}
          loading={(!plantPayload || !dataCenterPayload) && !loadError}
          loadError={loadError}
          onViewOnMap={viewFacilityOnMap}
        />
      )}

      {activeView === "area" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading local report...</div></main>}>
          <AreaReportView
            plants={plants}
            dataCenters={dataCenters}
            loading={(!plantPayload || !dataCenterPayload) && !loadError}
            loadError={loadError}
            initialArea={initialArea}
            onSearchPlace={searchPlaces}
            onOpenMap={openAreaOnMap}
          />
        </Suspense>
      )}

      {activeView === "signals" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading grid signals...</div></main>}>
          <GridSignalsView initialRegion={initialRegion} />
        </Suspense>
      )}

      {activeView === "analysis" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading regional analysis...</div></main>}>
          <AnalysisView dataCenters={dataCenters} initialStates={initialStates} />
        </Suspense>
      )}

      {activeView === "data_center_watch" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading Feeds...</div></main>}>
          <DataCenterWatchView />
        </Suspense>
      )}

      {activeView === "learn" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading learning center...</div></main>}>
          <LearnView plants={plants} dataCenters={dataCenters} fuelCounts={nationalFuelCounts} />
        </Suspense>
      )}

      <AppFooter />

      <GridGuide
        activeView={activeView}
        selectedFeature={selectedFeature?.feature ?? null}
        counts={{ powerPlants: plants.length, dataCenters: dataCenters.length }}
        layers={{
          powerPlants: showPowerPlants,
          dataCenters: showDataCenters,
          transmission: showTransmission,
          substations: showSubstations
        }}
          onApplyAction={applyGuideAction}
      />
      {analyticsEnabled && <Analytics />}
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer">
      <span>US Grid Explorer</span>
      <nav aria-label="Trust and policy links">
        <a href="/about/">About</a>
        <a href="/methodology/">Methodology</a>
        <a href="/sources/">Sources</a>
        <a href="/privacy/">Privacy</a>
        <a href="/terms/">Terms</a>
        <a href="/corrections/">Corrections</a>
      </nav>
    </footer>
  );
}

function TourOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    { eyebrow: "Welcome", title: "Read the grid as a system", body: "US Grid Explorer connects generation, data centers, transmission, substations, and live demand in one sourced workspace." },
    { eyebrow: "Step 1 of 4", title: "Control the infrastructure layers", body: "Use Map Layers to compare fuels, reveal the high-voltage network, and add transmission-associated substations." },
    { eyebrow: "Step 2 of 4", title: "Search facilities and places", body: "Find a plant or data center instantly, or press Enter to geocode any U.S. city, address, or ZIP code." },
    { eyebrow: "Step 3 of 4", title: "Inspect the evidence", body: "Select a map feature to see capacity, voltage, owner, status, coverage quality, and the underlying source." },
    { eyebrow: "Step 4 of 4", title: "Move from map to analysis", body: "Facilities, Grid Signals, Analysis, and Learn turn the map into a complete infrastructure research tool." }
  ];
  const current = steps[step];
  return (
    <div className={`tour-overlay step-${step}`}>
      <div className="tour-shade"></div>
      <section className="tour-card">
        <span>{current.eyebrow}</span>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="tour-progress">{steps.map((_, index) => <i key={index} className={index <= step ? "active" : ""}></i>)}</div>
        <footer>
          <button className="tour-skip" onClick={onClose}>Exit tour</button>
          <div>
            {step > 0 && <button onClick={() => setStep((value) => value - 1)}>Back</button>}
            <button className="tour-next" onClick={() => step + 1 < steps.length ? setStep((value) => value + 1) : onClose()}>{step + 1 < steps.length ? "Next" : "Start exploring"}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

async function fetchLayer(url, label) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${label} data returned ${response.status}`);
  return response.json();
}

function countPlantsByFuel(plants) {
  const counts = Object.fromEntries(
    Object.keys(INITIAL_FUEL_VISIBILITY).map((category) => [category, 0])
  );
  plants.forEach((plant) => {
    const category = plant.properties.primaryFuel;
    counts[category] = (counts[category] ?? 0) + 1;
  });
  return counts;
}

function countPlantsByStatus(plants) {
  return plants.reduce((counts, plant) => {
    if (plant.properties.operatingCapacityMw > 0) counts.operating += 1;
    if (plant.properties.proposedCapacityMw > 0) counts.proposed += 1;
    return counts;
  }, { operating: 0, proposed: 0 });
}

function isPlantVisibleByStatus(plant, visibility) {
  return (visibility.operating && plant.properties.operatingCapacityMw > 0)
    || (visibility.proposed && plant.properties.proposedCapacityMw > 0);
}

function isPointInBounds(feature, bounds) {
  const [longitude, latitude] = feature.geometry.coordinates;
  return longitude >= bounds.west && longitude <= bounds.east
    && latitude >= bounds.south && latitude <= bounds.north;
}

function dataCenterSubtitle(center) {
  const { city, state, address, operator } = center.properties;
  const location = [city, state].filter(Boolean).join(", ");
  return location || address || operator || "Community-reported location";
}

async function searchPlaces(query) {
  const url = new URL("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates");
  url.searchParams.set("SingleLine", query);
  url.searchParams.set("f", "json");
  url.searchParams.set("countryCode", "USA");
  url.searchParams.set("maxLocations", "6");
  url.searchParams.set("outFields", "Match_addr,Addr_type,City,RegionAbbr,Postal,County");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Place search returned ${response.status}`);
  const payload = await response.json();
  const seen = new Set();
  return (payload.candidates ?? []).filter((candidate) => {
    const key = `${candidate.address}-${candidate.location?.x}-${candidate.location?.y}`;
    if (!candidate.location || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseInitialArea(params) {
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 15 || latitude > 75 || longitude < -180 || longitude > -60) return null;
  return {
    label: String(params.get("label") || "Shared U.S. area").slice(0, 80),
    city: "",
    state: String(params.get("state") || "").slice(0, 2).toUpperCase(),
    postalCode: String(params.get("zip") || "").slice(0, 10),
    type: String(params.get("type") || "shared_area").slice(0, 30),
    score: 0,
    latitude,
    longitude
  };
}
