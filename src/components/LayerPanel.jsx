import { ChevronDown, Database, Server, Zap } from "lucide-react";
import { FUEL_COLORS } from "./ExploreMap.jsx";

const FUEL_LABELS = {
  oil_gas: "Oil & gas",
  coal: "Coal",
  nuclear: "Nuclear",
  wind: "Wind",
  solar: "Solar",
  hydro: "Hydro",
  storage: "Storage",
  biomass: "Biomass",
  geothermal: "Geothermal",
  other: "Other"
};

export default function LayerPanel({
  plantCount,
  dataCenterCount,
  fuelCounts,
  fuelVisibility,
  showPowerPlants,
  showDataCenters,
  onTogglePowerPlants,
  onToggleDataCenters,
  onToggleFuel,
  loading,
  loadError
}) {
  return (
    <aside className="layer-panel floating-panel">
      <div className="panel-title">
        <span><Database size={15} />Map layers</span>
        <ChevronDown size={16} />
      </div>

      <LayerToggle
        icon={<Zap size={16} />}
        label="Power plants"
        count={loading ? "..." : plantCount.toLocaleString()}
        checked={showPowerPlants}
        onChange={onTogglePowerPlants}
      />

      {showPowerPlants && (
        <div className="fuel-grid">
          {Object.entries(FUEL_LABELS).map(([category, label]) => (
            <button
              key={category}
              className={fuelVisibility[category] ? "active" : ""}
              onClick={() => onToggleFuel(category)}
            >
              <i style={{ background: FUEL_COLORS[category] }}></i>
              <span>{label}</span>
              <small>{fuelCounts[category]?.toLocaleString() ?? 0}</small>
            </button>
          ))}
        </div>
      )}

      <LayerToggle
        icon={<Server size={16} />}
        label="Data centers"
        count={dataCenterCount}
        checked={showDataCenters}
        onChange={onToggleDataCenters}
      />

      <div className="locked-layer"><span>Transmission lines</span><small>Next layer</small></div>
      <div className="locked-layer"><span>Substations</span><small>Next layer</small></div>

      {loadError && <p className="panel-error">Could not load power plants: {loadError}</p>}
    </aside>
  );
}

function LayerToggle({ icon, label, count, checked, onChange }) {
  return (
    <label className="layer-toggle">
      <span>{icon}<b>{label}</b><small>{count}</small></span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}
