import { ExternalLink, Server, X, Zap } from "lucide-react";

export default function SelectionPanel({ selection, sourceRegistry, onClose }) {
  if (!selection) {
    return (
      <aside className="selection-panel floating-panel empty-selection">
        <span className="eyebrow">Infrastructure details</span>
        <div className="empty-icon"><Zap size={24} /></div>
        <h2>Select a map feature</h2>
        <p>Choose a power plant or data center to inspect capacity, location, operator, status, and source.</p>
      </aside>
    );
  }

  const isPlant = selection.type === "power_plant";
  const feature = selection.feature;
  const source = sourceRegistry[feature.sourceRef] ?? null;

  return (
    <aside className="selection-panel floating-panel">
      <button className="close-button" onClick={onClose} aria-label="Close details"><X size={17} /></button>
      <span className="eyebrow">{isPlant ? "Power plant" : "Data center cluster"}</span>
      <div className="detail-heading">
        <span>{isPlant ? <Zap size={20} /> : <Server size={20} />}</span>
        <h2>{feature.name}</h2>
      </div>

      {isPlant ? (
        <dl>
          <Detail label="Location" value={`${feature.properties.city}, ${feature.properties.state}`} />
          <Detail label="Primary fuel" value={formatLabel(feature.properties.primaryFuel)} />
          <Detail label="Operating capacity" value={`${feature.properties.operatingCapacityMw.toLocaleString()} MW`} />
          <Detail label="Proposed capacity" value={`${feature.properties.proposedCapacityMw.toLocaleString()} MW`} />
          <Detail label="Utility" value={feature.properties.utilityName || "Not reported"} />
          <Detail label="Balancing authority" value={feature.properties.balancingAuthorityName || "Not reported"} />
          <Detail label="EIA plant code" value={feature.properties.plantCode} />
        </dl>
      ) : (
        <dl>
          <Detail label="Location" value={dataCenterLocation(feature)} />
          <Detail label="Operator" value={feature.properties.operator || "Not reported"} />
          <Detail label="Status" value={formatLabel(feature.properties.status)} />
          <Detail label="Capacity" value="Not publicly reported" />
          <Detail label="OSM record" value={`${feature.properties.osmType} ${feature.properties.osmId}`} />
          <Detail label="Coverage" value="Community-reported" />
        </dl>
      )}

      <div className="source-card">
        <span>Source & confidence</span>
        <strong>{source?.dataset ?? "Regional seed record"}</strong>
        <p>{source?.note ?? "Coordinates and capacity are approximate until parcel-level verification is complete."}</p>
        <a href={source?.url ?? feature.sourceUrl} target="_blank" rel="noreferrer">
          Open source <ExternalLink size={14} />
        </a>
      </div>
    </aside>
  );
}

function Detail({ label, value }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function formatLabel(value) {
  return String(value ?? "Other").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dataCenterLocation(feature) {
  const { address, city, state } = feature.properties;
  return address || [city, state].filter(Boolean).join(", ") || "Location only";
}
