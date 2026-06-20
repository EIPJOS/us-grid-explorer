import { ChevronDown, Compass, Database, Server, Zap } from "lucide-react";
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
  other: "Industrial & other"
};

export default function LayerPanel({
  plantCount,
  dataCenterCount,
  fuelCounts,
  fuelVisibility,
  plantStatusVisibility,
  plantStatusCounts,
  showPowerPlants,
  showDataCenters,
  showTransmission,
  showSubstations,
  onTogglePowerPlants,
  onToggleDataCenters,
  onToggleTransmission,
  onToggleSubstations,
  onStartTour,
  onToggleFuel,
  onTogglePlantStatus,
  loading,
  loadError
}) {
  const visibleFuelCount = Object.values(fuelVisibility).filter(Boolean).length;
  const totalFuelCount = Object.keys(FUEL_LABELS).length;

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
        <div className="fuel-controls">
          <div className="plant-status-controls" aria-label="Power plant status">
            {[["operating", "Operating"], ["proposed", "Proposed"]].map(([status, label]) => (
              <button key={status} className={plantStatusVisibility[status] ? "active" : ""} aria-pressed={plantStatusVisibility[status]} onClick={() => onTogglePlantStatus(status)}>
                <span>{label}</span><small>{plantStatusCounts[status]?.toLocaleString() ?? 0}</small>
              </button>
            ))}
          </div>
          <div className="fuel-coverage"><span>Fuel categories</span><strong>{visibleFuelCount} of {totalFuelCount} shown</strong></div>
          <div className="fuel-grid">
            {Object.entries(FUEL_LABELS).map(([category, label]) => (
              <button
                key={category}
                className={fuelVisibility[category] ? "active" : ""}
                aria-pressed={fuelVisibility[category]}
                onClick={() => onToggleFuel(category)}
              >
                <i style={{ background: FUEL_COLORS[category] }}></i>
                <span>{label}</span>
                <small>{fuelCounts[category]?.toLocaleString() ?? 0}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <LayerToggle
        icon={<Server size={16} />}
        label="Data centers"
        count={dataCenterCount}
        checked={showDataCenters}
        onChange={onToggleDataCenters}
      />
      {showDataCenters && <p className="layer-note">Community-mapped locations; coverage is incomplete.</p>}

      <LayerToggle
        icon={<Zap size={16} />}
        label="Transmission lines"
        count="52,244"
        checked={showTransmission}
        onChange={onToggleTransmission}
      />
      {showTransmission && (
        <div className="voltage-legend">
          <span><i className="v500"></i>500+ kV</span>
          <span><i className="v345"></i>345-499 kV</span>
          <span><i className="v230"></i>230-344 kV</span>
          <span><i className="vlow"></i>Below 230 kV</span>
          <small>Lower-voltage lines appear as you zoom in.</small>
        </div>
      )}
      <LayerToggle
        icon={<Database size={16} />}
        label="Substations"
        count="77,946"
        checked={showSubstations}
        onChange={onToggleSubstations}
      />
      {showSubstations && (
        <div className="substation-legend">
          <i></i><span>Transmission-associated substation</span>
          <small>Lower-voltage sites appear as you zoom in.</small>
        </div>
      )}

      {loadError && <p className="panel-error">Could not load power plants: {loadError}</p>}
      <button className="tour-launch" onClick={onStartTour}><Compass size={15} />Take the map tour</button>
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
