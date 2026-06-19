import { useEffect, useMemo, useState } from "react";
import { BarChart3, Database, Server, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
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

export default function AnalysisView({ dataCenters }) {
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [selectedState, setSelectedState] = useState("VA");
  const [compareState, setCompareState] = useState("TX");

  useEffect(() => {
    fetch("/data/state-analysis.json")
      .then((response) => {
        if (!response.ok) throw new Error(`State analysis returned ${response.status}`);
        return response.json();
      })
      .then(setPayload)
      .catch((requestError) => setError(requestError.message));
  }, []);

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

  const selected = joinedStates.find((state) => state.state === selectedState);
  const comparison = joinedStates.find((state) => state.state === compareState);
  const topCapacity = [...joinedStates]
    .sort((a, b) => b.operatingCapacityMw - a.operatingCapacityMw)
    .slice(0, 12);
  const topDataCenters = [...joinedStates]
    .sort((a, b) => b.dataCenterCount - a.dataCenterCount)
    .slice(0, 10);
  const knownStateCount = Object.values(dataCenterCounts).reduce((sum, count) => sum + count, 0);

  if (error) return <main className="view-shell"><div className="view-error">{error}</div></main>;
  if (!payload || !selected || !comparison) return <main className="view-shell"><div className="page-loading">Loading finalized EIA analysis...</div></main>;

  return (
    <main className="view-shell analysis-view">
      <section className="view-heading analysis-heading">
        <div>
          <span className="eyebrow">State and regional comparison</span>
          <h1>Grid Analysis</h1>
          <p>Compare finalized generation capacity and facility counts with community-reported data-center coverage.</p>
        </div>
        <div className="analysis-selectors">
          <label>Primary state<select value={selectedState} onChange={(event) => setSelectedState(event.target.value)}>{joinedStates.map(stateOption)}</select></label>
          <span>versus</span>
          <label>Comparison<select value={compareState} onChange={(event) => setCompareState(event.target.value)}>{joinedStates.map(stateOption)}</select></label>
        </div>
      </section>

      <section className="comparison-grid">
        <StateSummary state={selected} accent="lime" />
        <StateSummary state={comparison} accent="blue" />
      </section>

      <section className="analysis-grid">
        <article className="analysis-card capacity-chart-card">
          <CardTitle icon={<BarChart3 size={16} />} title="Largest state power systems" note="Final 2024 nameplate capacity" />
          <div className="analysis-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCapacity} margin={{ top: 18, right: 14, left: 8, bottom: 5 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="state" stroke="#7f8ba3" axisLine={false} tickLine={false} />
                <YAxis stroke="#7f8ba3" axisLine={false} tickLine={false} width={52} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toLocaleString()} MW`, "Operating capacity"]} />
                <Bar dataKey="operatingCapacityMw" fill="#7d9fff" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analysis-card fuel-card">
          <CardTitle icon={<Zap size={16} />} title={`${selected.stateName} fuel mix`} note="Nameplate capacity" />
          <div className="analysis-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fuelData(selected)} dataKey="value" nameKey="name" innerRadius="48%" outerRadius="76%" paddingAngle={1.5}>
                  {fuelData(selected).map((entry) => <Cell key={entry.key} fill={FUEL_COLORS[entry.key]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toLocaleString()} MW`, "Capacity"]} />
                <Legend formatter={(value) => formatLabel(value)} />
              </PieChart>
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

function StateSummary({ state, accent }) {
  return (
    <article className={`state-summary ${accent}`}>
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

function stateOption(state) {
  return <option key={state.state} value={state.state}>{state.stateName} ({state.state})</option>;
}

function fuelData(state) {
  return Object.entries(state.capacityByFuelMw)
    .map(([key, value]) => ({ key, name: key, value }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value);
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const tooltipStyle = {
  background: "#111723",
  border: "1px solid rgba(166,184,221,.2)",
  borderRadius: 8
};
