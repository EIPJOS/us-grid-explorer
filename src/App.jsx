import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Database, Map, Radio, Search, Zap } from "lucide-react";
import ExploreMap from "./components/ExploreMap.jsx";
import LayerPanel from "./components/LayerPanel.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import SelectionPanel from "./components/SelectionPanel.jsx";
import FacilitiesView from "./components/FacilitiesView.jsx";

const GridSignalsView = lazy(() => import("./components/GridSignalsView.jsx"));

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
  }
};

export default function App() {
  const [activeView, setActiveView] = useState("explore");
  const [plantPayload, setPlantPayload] = useState(null);
  const [dataCenterPayload, setDataCenterPayload] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [showDataCenters, setShowDataCenters] = useState(true);
  const [showPowerPlants, setShowPowerPlants] = useState(true);
  const [showTransmission, setShowTransmission] = useState(true);
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
        </nav>

        <div className="release-badge">
          <i></i>
          {activeView === "signals" ? "EIA-930 hourly data" : "EIA-860 2025 early release"}
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
            focusRequest={focusRequest}
            onSelect={setSelectedFeature}
          />

          <SearchPanel
            icon={<Search size={18} />}
            items={searchItems}
            loading={(!plantPayload || !dataCenterPayload) && !loadError}
            onSelect={selectFromSearch}
          />

          <LayerPanel
            plantCount={plants.length}
            dataCenterCount={dataCenters.length}
            fuelCounts={fuelCounts}
            fuelVisibility={fuelVisibility}
            showPowerPlants={showPowerPlants}
            showDataCenters={showDataCenters}
            showTransmission={showTransmission}
            onTogglePowerPlants={() => setShowPowerPlants((value) => !value)}
            onToggleDataCenters={() => setShowDataCenters((value) => !value)}
            onToggleTransmission={() => setShowTransmission((value) => !value)}
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
