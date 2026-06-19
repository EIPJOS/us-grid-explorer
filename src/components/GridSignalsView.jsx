import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, Clock3, RefreshCw, Radio } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const REGIONS = {
  PJM: "PJM Interconnection",
  ERCO: "ERCOT",
  MISO: "MISO",
  CISO: "California ISO",
  NYIS: "New York ISO",
  ISNE: "ISO New England",
  SWPP: "Southwest Power Pool"
};

export default function GridSignalsView({ initialRegion }) {
  const [rows, setRows] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[initialRegion] ? initialRegion : "PJM");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSignals = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(buildEiaUrl())
      .then((response) => {
        if (!response.ok) throw new Error(`EIA API returned ${response.status}`);
        return response.json();
      })
      .then((payload) => setRows(payload.response?.data ?? []))
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadSignals(), [loadSignals]);

  const byRegion = useMemo(() => {
    const grouped = Object.fromEntries(Object.keys(REGIONS).map((code) => [code, []]));
    rows.forEach((row) => {
      if (!grouped[row.respondent]) return;
      grouped[row.respondent].push({
        period: row.period,
        value: Number(row.value),
        label: formatHour(row.period)
      });
    });
    Object.values(grouped).forEach((values) => values.sort((a, b) => a.period.localeCompare(b.period)));
    return grouped;
  }, [rows]);

  const chartData = byRegion[selectedRegion] ?? [];
  const latestPeriod = rows.reduce((latest, row) => row.period > latest ? row.period : latest, "");

  return (
    <main className="view-shell signals-view">
      <section className="view-heading">
        <div>
          <span className="eyebrow">Near-real-time grid operations</span>
          <h1>Grid Signals</h1>
          <p>Hourly electricity demand reported by major U.S. balancing authorities through EIA-930.</p>
        </div>
        <div className="signal-status">
          <span><i></i>{error ? "Feed unavailable" : loading ? "Refreshing" : "EIA feed connected"}</span>
          <small><Clock3 size={13} />Latest period: {latestPeriod ? formatPeriod(latestPeriod) : "Waiting for data"}</small>
          <button onClick={loadSignals} disabled={loading}><RefreshCw size={15} className={loading ? "spinning" : ""} />Refresh</button>
        </div>
      </section>

      {error && <div className="signal-error"><AlertCircle size={18} /><div><strong>Live feed could not be loaded</strong><span>{error}. The infrastructure map remains available.</span></div></div>}

      <section className="region-grid">
        {Object.entries(REGIONS).map(([code, name]) => {
          const values = byRegion[code] ?? [];
          const latest = values.at(-1);
          const previous = values.at(-2);
          const trend = latest && previous && previous.value ? ((latest.value - previous.value) / previous.value) * 100 : 0;
          return (
            <button key={code} className={selectedRegion === code ? "active" : ""} onClick={() => setSelectedRegion(code)}>
              <span><Radio size={14} />{code}</span>
              <strong>{latest ? `${(latest.value / 1000).toFixed(1)} GWh` : "--"}</strong>
              <small>{name}</small>
              <em className={trend >= 0 ? "up" : "down"}>{trend >= 0 ? "+" : ""}{trend.toFixed(1)}% vs prior hour</em>
            </button>
          );
        })}
      </section>

      <section className="signal-main-grid">
        <article className="signal-chart-card">
          <div className="card-title"><span><Activity size={16} />{REGIONS[selectedRegion]} hourly demand</span><small>Last 24 reported hours</small></div>
          <div className="signal-chart">
            {loading ? <div className="chart-state">Loading EIA-930 demand...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 18, right: 22, bottom: 8, left: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="label" stroke="#7f8ba3" tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis stroke="#7f8ba3" tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} width={48} />
                  <Tooltip contentStyle={{ background: "#111723", border: "1px solid rgba(166,184,221,.2)", borderRadius: 8 }} formatter={(value) => [`${Number(value).toLocaleString()} MWh`, "Hourly demand"]} />
                  <Line type="monotone" dataKey="value" stroke="#dfff3f" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#dfff3f" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <aside className="method-card">
          <span className="eyebrow">Methodology</span>
          <h2>What this signal means</h2>
          <p>Demand is the hourly electricity demand reported by each balancing authority to the U.S. Energy Information Administration.</p>
          <dl>
            <div><dt>Source</dt><dd>EIA-930</dd></div>
            <div><dt>Frequency</dt><dd>Hourly</dd></div>
            <div><dt>Unit</dt><dd>MWh during the hour</dd></div>
            <div><dt>Status</dt><dd>Preliminary operating data</dd></div>
          </dl>
          <a href="https://www.eia.gov/electricity/gridmonitor/about" target="_blank" rel="noreferrer">Read EIA methodology</a>
        </aside>
      </section>
    </main>
  );
}

function buildEiaUrl() {
  const url = new URL("https://api.eia.gov/v2/electricity/rto/region-data/data/");
  url.searchParams.set("api_key", "DEMO_KEY");
  url.searchParams.set("frequency", "hourly");
  url.searchParams.append("data[0]", "value");
  Object.keys(REGIONS).forEach((code) => url.searchParams.append("facets[respondent][]", code));
  url.searchParams.append("facets[type][]", "D");
  url.searchParams.append("sort[0][column]", "period");
  url.searchParams.append("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", "168");
  return url.toString();
}

function formatHour(period) {
  const hour = Number(period.slice(-2));
  return `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`;
}

function formatPeriod(period) {
  return period.replace("T", " ") + ":00 reported hour";
}
