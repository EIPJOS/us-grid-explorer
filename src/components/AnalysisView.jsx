import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, Database, Plus, Server, X, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const FUEL_COLORS = {
  oil_gas: "#ff6257",
  coal: "#8d99ae",
  nuclear: "#ffd84d",
  wind: "#86a8ff",
  solar: "#ffbe3d",
  hydro: "#4cc9f0",
  storage: "#bd80ff",
  biomass: "#69e2ae",
  geothermal: "#ff925c",
  other: "#c0c7d3"
};

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin",
  WY: "Wyoming", PR: "Puerto Rico"
};

const STATE_PROFILES = [
  ["VA", "virginia"],
  ["TX", "texas"],
  ["CA", "california"],
  ["PA", "pennsylvania"],
  ["AZ", "arizona"]
];

const COMPARISON_COLORS = ["#dfff3f", "#7d9fff", "#ff9e4f", "#bd80ff"];

export default function AnalysisView({ dataCenters, initialStates }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [selectedStates, setSelectedStates] = useState(() => normalizeInitialStates(initialStates));

  useEffect(() => {
    fetch("/data/state-analysis.json")
      .then((response) => {
        if (!response.ok) throw new Error(`State analysis returned ${response.status}`);
        return response.json();
      })
      .then(setPayload)
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", "analysis");
    params.set("states", selectedStates.join(","));
    params.delete("state");
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [selectedStates]);

  const dataCenterCounts = useMemo(() => {
    const counts = {};
    dataCenters.forEach((center) => {
      const state = center.properties.state;
      if (state) counts[state] = (counts[state] ?? 0) + 1;
    });
    return counts;
  }, [dataCenters]);

  const states = payload?.states ?? [];
  const joinedStates = useMemo(() => states.map((state) => ({
    ...state,
    dataCenterCount: dataCenterCounts[state.state] ?? 0,
    stateName: STATE_NAMES[state.state] ?? state.state
  })), [states, dataCenterCounts]);

  const selected = selectedStates
    .map((stateCode) => joinedStates.find((state) => state.state === stateCode))
    .filter(Boolean);
  const topDataCenters = [...joinedStates]
    .sort((a, b) => b.dataCenterCount - a.dataCenterCount)
    .slice(0, 10);
  const knownStateCount = Object.values(dataCenterCounts).reduce((sum, count) => sum + count, 0);

  if (error) return <main className="view-shell"><div className="view-error">{error}</div></main>;
  if (!payload || selected.length !== selectedStates.length) return <main className="view-shell"><div className="page-loading">Loading finalized EIA analysis...</div></main>;

  function changeState(index, nextState) {
    setSelectedStates((current) => current.map((state, stateIndex) => stateIndex === index ? nextState : state));
  }

  function addState() {
    const nextState = joinedStates.find((state) => !selectedStates.includes(state.state));
    if (nextState) setSelectedStates((current) => [...current, nextState.state]);
  }

  function removeState(index) {
    setSelectedStates((current) => current.filter((_, stateIndex) => stateIndex !== index));
  }

  return (
    <main className="view-shell analysis-view">
      <section className="view-heading analysis-heading">
        <div>
          <span className="eyebrow">State and regional comparison</span>
          <h1>Grid Analysis</h1>
          <p>Compare finalized generation capacity and facility counts with community-reported data-center coverage.</p>
        </div>
        <div className="analysis-selectors">
          {selectedStates.map((stateCode, index) => (
            <label key={`${stateCode}-${index}`}>
              State {index + 1}
              <span>
                <select value={stateCode} onChange={(event) => changeState(index, event.target.value)}>
                  {joinedStates.map((state) => stateOption(state, selectedStates, stateCode))}
                </select>
                {selectedStates.length > 2 && <button type="button" onClick={() => removeState(index)} aria-label={`Remove ${STATE_NAMES[stateCode]}`}><X size={14} /></button>}
              </span>
            </label>
          ))}
          {selectedStates.length < 4 && <button className="add-state-button" type="button" onClick={addState}><Plus size={15} />Add state</button>}
        </div>
      </section>

      <section className="comparison-grid">
        {selected.map((state, index) => <StateSummary key={state.state} state={state} color={COMPARISON_COLORS[index]} />)}
      </section>

      <section className="state-profile-strip" aria-labelledby="state-profile-title">
        <div>
          <span className="eyebrow">Search-ready research pages</span>
          <h2 id="state-profile-title">State grid profiles</h2>
          <p>Open a sourced, shareable summary built for quick reading and deeper research.</p>
          <a className="state-directory-cta" href="/states/">Browse all profiles <ArrowUpRight size={14} /></a>
        </div>
        <nav aria-label="Published state grid profiles">
          {STATE_PROFILES.map(([code, slug]) => (
            <a key={code} href={`/states/${slug}/`}>
              <span>{code}</span>
              <strong>{STATE_NAMES[code]}</strong>
              <ArrowUpRight size={15} />
            </a>
          ))}
        </nav>
      </section>

      <section className="analysis-grid">
        <article className="analysis-card capacity-chart-card">
          <CardTitle icon={<BarChart3 size={16} />} title="Capacity comparison" note="Final 2024 nameplate capacity" />
          <div className="analysis-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selected} margin={{ top: 18, right: 14, left: 8, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="state" stroke="#7f8ba3" axisLine={false} tickLine={false} />
                <YAxis stroke="#7f8ba3" axisLine={false} tickLine={false} width={52} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${Number(value).toLocaleString()} MW`, name === "operatingCapacityMw" ? "Operating" : "Proposed"]} />
                <Legend formatter={(value) => value === "operatingCapacityMw" ? "Operating" : "Proposed"} />
                <Bar dataKey="operatingCapacityMw" fill="#7d9fff" radius={[5, 5, 0, 0]} />
                <Bar dataKey="proposedCapacityMw" fill="#dfff3f" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analysis-card fuel-card">
          <CardTitle icon={<Zap size={16} />} title="Fuel mix comparison" note="Capacity by resource" />
          <div className="analysis-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fuelComparisonData(selected)} layout="vertical" margin={{ top: 12, right: 10, left: 18, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" horizontal={false} />
                <XAxis type="number" stroke="#7f8ba3" axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <YAxis type="category" dataKey="fuel" width={72} stroke="#7f8ba3" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, stateCode) => [`${Number(value).toLocaleString()} MW`, STATE_NAMES[stateCode] ?? stateCode]} />
                <Legend formatter={(stateCode) => STATE_NAMES[stateCode] ?? stateCode} />
                {selected.map((state, index) => <Bar key={state.state} dataKey={state.state} fill={COMPARISON_COLORS[index]} radius={[0, 4, 4, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analysis-card ranking-card">
          <CardTitle icon={<Server size={16} />} title="Reported data-center leaders" note={`${knownStateCount.toLocaleString()} records with state tags`} />
          <ol>{topDataCenters.map((state, index) => <li key={state.state}><b>{index + 1}</b><span>{state.stateName}<small>{state.state}</small></span><strong>{state.dataCenterCount.toLocaleString()}</strong></li>)}</ol>
        </article>
      </section>

      <section className="analysis-method">
        <Database size={17} />
        <p><strong>Methodology:</strong> Capacity and fuel mix use finalized EIA-860 2024 generator data. Data-center counts include only OpenStreetMap records with a reported state tag and are incomplete; they measure mapped coverage, not the full market.</p>
      </section>
    </main>
  );
}

function StateSummary({ state, color }) {
  return (
    <article className="state-summary" style={{ "--state-accent": color }}>
      <div><span>{state.state}</span><h2>{state.stateName}</h2></div>
      <Metric label="Operating capacity" value={`${Math.round(state.operatingCapacityMw).toLocaleString()} MW`} />
      <Metric label="Power plants" value={state.plantCount.toLocaleString()} />
      <Metric label="Data centers mapped" value={state.dataCenterCount.toLocaleString()} />
      <Metric label="Proposed capacity" value={`${Math.round(state.proposedCapacityMw).toLocaleString()} MW`} />
    </article>
  );
}

function Metric({ label, value }) {
  return <div className="analysis-metric"><small>{label}</small><strong>{value}</strong></div>;
}

function CardTitle({ icon, title, note }) {
  return <div className="card-title"><span>{icon}{title}</span><small>{note}</small></div>;
}

function stateOption(state, selectedStates, currentState) {
  return <option key={state.state} value={state.state} disabled={state.state !== currentState && selectedStates.includes(state.state)}>{state.stateName} ({state.state})</option>;
}

function normalizeInitialStates(initialStates) {
  const unique = [...new Set(initialStates.filter((state) => STATE_NAMES[state]))].slice(0, 4);
  if (unique.length === 0) return ["VA", "TX"];
  if (unique.length === 1) return [unique[0], unique[0] === "TX" ? "VA" : "TX"];
  return unique;
}

function fuelComparisonData(states) {
  return Object.keys(FUEL_COLORS).map((fuel) => ({
    fuel: formatLabel(fuel),
    ...Object.fromEntries(states.map((state) => [state.state, state.capacityByFuelMw[fuel] ?? 0]))
  })).filter((entry) => states.some((state) => entry[state.state] > 0));
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const tooltipStyle = {
  background: "#111723",
  border: "1px solid rgba(166,184,221,.2)",
  borderRadius: 8
};
