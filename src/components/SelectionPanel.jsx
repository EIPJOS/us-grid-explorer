import { ExternalLink, MapPin, Server, X, Zap } from "lucide-react";
import { trackEvent } from "../lib/analytics.js";

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
  const isTransmission = selection.type === "transmission_line";
  const isSubstation = selection.type === "substation";
  const isPlace = selection.type === "place";
  const feature = selection.feature;
  const source = sourceRegistry[feature.sourceRef] ?? null;

  return (
    <aside className="selection-panel floating-panel">
      <button className="close-button" onClick={onClose} aria-label="Close details"><X size={17} /></button>
      <span className="eyebrow">{isPlant ? "Power plant" : isTransmission ? "Transmission line" : isSubstation ? "Substation" : isPlace ? "Place" : "Data center"}</span>
      <div className="detail-heading">
        <span>{isPlace ? <MapPin size={20} /> : isPlant || isTransmission || isSubstation ? <Zap size={20} /> : <Server size={20} />}</span>
        <h2>{feature.name}</h2>
      </div>

      {isPlant ? (
        <dl>
          <Detail label="Location" value={`${feature.properties.city}, ${feature.properties.state}`} />
          <Detail label="Primary fuel" value={formatLabel(feature.properties.primaryFuel)} />
          <Detail label="Project status" value={formatLabel(feature.properties.projectStatus || (feature.properties.operatingCapacityMw > 0 ? "operating" : "proposed"))} />
          <Detail label="Operating capacity" value={`${feature.properties.operatingCapacityMw.toLocaleString()} MW`} />
          <Detail label="Proposed capacity" value={`${feature.properties.proposedCapacityMw.toLocaleString()} MW`} />
          <Detail label="Utility" value={feature.properties.utilityName || "Not reported"} />
          <Detail label="Balancing authority" value={feature.properties.balancingAuthorityName || "Not reported"} />
          <Detail label="EIA plant code" value={feature.properties.plantCode} />
        </dl>
      ) : isTransmission ? (
        <dl>
          <Detail label="Voltage" value={feature.properties.voltage ? `${feature.properties.voltage.toLocaleString()} kV` : "Not reported"} />
          <Detail label="Voltage class" value={feature.properties.voltageClass || "Not reported"} />
          <Detail label="Owner" value={feature.properties.owner || "Not reported"} />
          <Detail label="Status" value={feature.properties.status || "Not reported"} />
          <Detail label="From" value={feature.properties.substationFrom || "Not reported"} />
          <Detail label="To" value={feature.properties.substationTo || "Not reported"} />
        </dl>
      ) : isSubstation ? (
        <dl>
          <Detail label="Location" value={[feature.properties.city, feature.properties.state].filter(Boolean).join(", ") || "Not reported"} />
          <Detail label="County" value={feature.properties.county || "Not reported"} />
          <Detail label="Maximum voltage" value={feature.properties.maxVoltage ? `${feature.properties.maxVoltage.toLocaleString()} kV` : "Not reported"} />
          <Detail label="Minimum voltage" value={feature.properties.minVoltage ? `${feature.properties.minVoltage.toLocaleString()} kV` : "Not reported"} />
          <Detail label="Connected lines" value={feature.properties.lines || "Not reported"} />
          <Detail label="Status" value={feature.properties.status || "Not reported"} />
        </dl>
      ) : isPlace ? (
        <dl>
          <Detail label="Result type" value={formatLabel(feature.properties.addressType)} />
          <Detail label="City" value={feature.properties.city || "Not reported"} />
          <Detail label="State" value={feature.properties.state || "Not reported"} />
          <Detail label="ZIP code" value={feature.properties.postalCode || "Not reported"} />
          <Detail label="Match score" value={`${Math.round(feature.properties.score)}%`} />
          <Detail label="Purpose" value="Map navigation" />
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
        <div className="source-badges">
          <b className={`confidence-badge ${confidenceKey(feature, source)}`}>{confidenceLabel(feature, source)}</b>
          {source?.cadence && <b className="cadence-badge">{formatLabel(source.cadence)}</b>}
        </div>
        {source?.checkedAt && <small>Source checked {formatDate(source.checkedAt)}</small>}
        <p>{source?.note ?? "Coordinates and capacity are approximate until parcel-level verification is complete."}</p>
        <a href={source?.url ?? feature.sourceUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("Source Opened", { source_ref: feature.sourceRef ?? "embedded", feature_type: selection.type })}>
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
  if (value === "other") return "Industrial & other";
  return String(value ?? "Other").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dataCenterLocation(feature) {
  const { address, city, state } = feature.properties;
  return address || [city, state].filter(Boolean).join(", ") || "Location only";
}

function confidenceKey(feature, source) {
  if (feature.properties?.releaseStatus === "preliminary") return "preliminary";
  return source?.confidence ?? "estimated";
}

function confidenceLabel(feature, source) {
  return formatLabel(confidenceKey(feature, source));
}

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
