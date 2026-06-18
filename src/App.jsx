import { useEffect, useMemo, useState } from "react";
import { Database, Map, Radio, Search, Zap } from "lucide-react";
import { dataCenters } from "./data/datacenters.js";
import ExploreMap from "./components/ExploreMap.jsx";
import LayerPanel from "./components/LayerPanel.jsx";
import SearchPanel from "./components/SearchPanel.jsx";
import SelectionPanel from "./components/SelectionPanel.jsx";

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

export default function App() {
  const [plantPayload, setPlantPayload] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [showDataCenters, setShowDataCenters] = useState(true);
  const [showPowerPlants, setShowPowerPlants] = useState(true);
  const [fuelVisibility, setFuelVisibility] = useState(INITIAL_FUEL_VISIBILITY);

  useEffect(() => {
    let active = true;

    fetch("/data/power-plants.json")
      .then((response) => {
        if (!response.ok) throw new Error(`Power-plant data returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (active) setPlantPayload(payload);
      })
      .catch((error) => {
        if (active) setLoadError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  const plants = plantPayload?.features ?? [];
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
      subtitle: `${center.city}, ${center.county} County, VA`,
      coordinates: [center.longitude, center.latitude],
      feature: center
    }));
    return [...centerItems, ...plantItems];
  }, [plants]);

  function selectFromSearch(item) {
    setSelectedFeature({ type: item.type, feature: item.feature });
    setFocusRequest({ coordinates: item.coordinates, id: item.id, nonce: Date.now() });
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
          <button className="active"><Map size={16} />Explore</button>
          <button><Database size={16} />Facilities</button>
          <button><Radio size={16} />Grid signals</button>
        </nav>

        <div className="release-badge">
          <i></i>
          EIA-860 2025 early release
        </div>
      </header>

      <main className="explore-shell">
        <ExploreMap
          plants={plants}
          dataCenters={dataCenters}
          fuelVisibility={fuelVisibility}
          showPowerPlants={showPowerPlants}
          showDataCenters={showDataCenters}
          focusRequest={focusRequest}
          onSelect={setSelectedFeature}
        />

        <SearchPanel
          icon={<Search size={18} />}
          items={searchItems}
          loading={!plantPayload && !loadError}
          onSelect={selectFromSearch}
        />

        <LayerPanel
          plantCount={plants.length}
          dataCenterCount={dataCenters.length}
          fuelCounts={fuelCounts}
          fuelVisibility={fuelVisibility}
          showPowerPlants={showPowerPlants}
          showDataCenters={showDataCenters}
          onTogglePowerPlants={() => setShowPowerPlants((value) => !value)}
          onToggleDataCenters={() => setShowDataCenters((value) => !value)}
          onToggleFuel={toggleFuel}
          loading={!plantPayload && !loadError}
          loadError={loadError}
        />

        <SelectionPanel
          selection={selectedFeature}
          sourceRegistry={plantPayload?.meta?.sources ?? {}}
          onClose={() => setSelectedFeature(null)}
        />

        <div className="coverage-note">
          <strong>Coverage</strong>
          <span>Power plants: nationwide</span>
          <span>Data centers: Virginia seed region</span>
        </div>
      </main>
    </div>
  );
}
