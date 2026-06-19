import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Database, Map, Radio, Search, Zap } from "lucide-react";
import ExploreMap from "./components/ExploreMap.jsx";
import LayerPanel from "./components/LayerPanel.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import SelectionPanel from "./components/SelectionPanel.jsx";
import FacilitiesView from "./components/FacilitiesView.jsx";

const GridSignalsView = lazy(() => import("./components/GridSignalsView.jsx"));
const AnalysisView = lazy(() => import("./components/AnalysisView.jsx"));
const LearnView = lazy(() => import("./components/LearnView.jsx"));

const INITIAL_FUEL_VISIBILITY = {
  oil_gas: true,
  coal: true,
  nuclear: true,
  wind: true,
  solar: true,
  hydro: true,
  storage: true,
  biomass: false,
  geothermal: false,
  other: false
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
  const [activeView, setActiveView] = useState("explore");
  const [tourOpen, setTourOpen] = useState(false);
  const [plantPayload, setPlantPayload] = useState(null);
  const [dataCenterPayload, setDataCenterPayload] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [showDataCenters, setShowDataCenters] = useState(true);
  const [showPowerPlants, setShowPowerPlants] = useState(true);
  const [showTransmission, setShowTransmission] = useState(true);
  const [showSubstations, setShowSubstations] = useState(false);
  const [fuelVisibility, setFuelVisibility] = useState(INITIAL_FUEL_VISIBILITY);

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
  const fuelCounts = useMemo(() => {
    const counts = Object.fromEntries(
      Object.keys(INITIAL_FUEL_VISIBILITY).map((category) => [category, 0])
    );
    plants.forEach((plant) => {
      const category = plant.properties.primaryFuel;
      counts[category] = (counts[category] ?? 0) + 1;
    });
    return counts;
  }, [plants]);

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

  function selectFromSearch(item) {
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
    setSelectedFeature({ type: "place", feature });
    setFocusRequest({ coordinates: feature.geometry.coordinates, id: feature.id, nonce: Date.now() });
  }

  function viewFacilityOnMap(selection) {
    const coordinates = selection.feature.geometry.coordinates;
    setSelectedFeature(selection);
    setFocusRequest({ coordinates, id: selection.feature.id, nonce: Date.now() });
    setActiveView("explore");
  }

  function toggleFuel(category) {
    setFuelVisibility((current) => ({ ...current, [category]: !current[category] }));
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
          <button className={activeView === "explore" ? "active" : ""} onClick={() => setActiveView("explore")}><Map size={16} />Explore</button>
          <button className={activeView === "facilities" ? "active" : ""} onClick={() => setActiveView("facilities")}><Database size={16} />Facilities</button>
          <button className={activeView === "signals" ? "active" : ""} onClick={() => setActiveView("signals")}><Radio size={16} />Grid signals</button>
          <button className={activeView === "analysis" ? "active" : ""} onClick={() => setActiveView("analysis")}><BarChart3 size={16} />Analysis</button>
          <button className={activeView === "learn" ? "active" : ""} onClick={() => setActiveView("learn")}><BookOpen size={16} />Learn</button>
        </nav>

        <div className="release-badge">
          <i></i>
          {activeView === "signals" ? "EIA-930 hourly data" : activeView === "analysis" ? "EIA-860 2024 final" : activeView === "learn" ? "Learning center" : "EIA-860 2025 early release"}
        </div>
      </header>

      {activeView === "explore" && (
        <main className="explore-shell">
          <ExploreMap
            plants={plants}
            dataCenters={dataCenters}
            fuelVisibility={fuelVisibility}
            showPowerPlants={showPowerPlants}
            showDataCenters={showDataCenters}
            showTransmission={showTransmission}
            showSubstations={showSubstations}
            focusRequest={focusRequest}
            onSelect={setSelectedFeature}
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
            plantCount={plants.length}
            dataCenterCount={dataCenters.length}
            fuelCounts={fuelCounts}
            fuelVisibility={fuelVisibility}
            showPowerPlants={showPowerPlants}
            showDataCenters={showDataCenters}
            showTransmission={showTransmission}
            showSubstations={showSubstations}
            onTogglePowerPlants={() => setShowPowerPlants((value) => !value)}
            onToggleDataCenters={() => setShowDataCenters((value) => !value)}
            onToggleTransmission={() => setShowTransmission((value) => !value)}
            onToggleSubstations={() => setShowSubstations((value) => !value)}
            onStartTour={() => setTourOpen(true)}
            onToggleFuel={toggleFuel}
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

      {activeView === "signals" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading grid signals...</div></main>}>
          <GridSignalsView />
        </Suspense>
      )}

      {activeView === "analysis" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading regional analysis...</div></main>}>
          <AnalysisView dataCenters={dataCenters} />
        </Suspense>
      )}

      {activeView === "learn" && (
        <Suspense fallback={<main className="view-shell"><div className="page-loading">Loading learning center...</div></main>}>
          <LearnView plants={plants} dataCenters={dataCenters} fuelCounts={fuelCounts} />
        </Suspense>
      )}
    </div>
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
  url.searchParams.set("outFields", "Match_addr,Addr_type,City,RegionAbbr,Postal");
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
