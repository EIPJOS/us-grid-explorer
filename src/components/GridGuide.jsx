import { useMemo, useState } from "react";
import { ArrowUpRight, ExternalLink, MessageCircle, Sparkles, X, Zap } from "lucide-react";

const CITATIONS = {
  eia860: { label: "EIA-860 power plant data", url: "https://www.eia.gov/electricity/data/eia860/" },
  eia930: { label: "EIA-930 grid monitor", url: "https://www.eia.gov/electricity/gridmonitor/about" },
  osm: { label: "OpenStreetMap", url: "https://www.openstreetmap.org/" },
  transmission: { label: "Transmission line service", url: "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/ArcGIS/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0" },
  substations: { label: "HIFLD substations", url: "https://www.arcgis.com/home/item.html?id=83397b209bfb4007a2f4c00e70df8e5d" }
};

const WELCOME = {
  role: "assistant",
  text: "Pick a common grid question below. These answers are prebuilt from the project's source notes, so they are instant and do not use the OpenAI API."
};

const GUIDE_ANSWERS = {
  map_overview: {
    label: "What am I looking at?",
    views: ["explore"],
    answer: ({ counts }) => `This map combines major U.S. electric-infrastructure layers in one workspace: ${formatCount(counts.powerPlants)} power plants, ${formatCount(counts.dataCenters)} community-reported data centers, transmission lines, and substations.\n\nThe default view emphasizes operating power plants and mapped data centers. Use Map Layers to reveal more fuels, proposed plants, high-voltage lines, and substations.`,
    citations: [CITATIONS.eia860, CITATIONS.osm],
    action: { type: "none", target: "" },
    followUps: ["show_transmission", "data_center_coverage", "fuel_filters"]
  },
  show_transmission: {
    label: "Show me the transmission layer",
    answer: () => "Transmission lines show the high-voltage network that moves electricity from generation areas toward cities, substations, and large industrial loads. On this map, higher-voltage lines appear first, and lower-voltage lines appear as you zoom in.",
    citations: [CITATIONS.transmission],
    action: { type: "show_layer", target: "transmission" },
    followUps: ["substations_meaning", "map_overview", "power_to_city"]
  },
  power_to_city: {
    label: "How does power reach a city?",
    answer: () => "Power usually moves from generators onto high-voltage transmission lines, steps down through substations, then moves through local distribution lines to homes, offices, factories, and data centers.\n\nThis app focuses on the higher-level system: plants, transmission corridors, substations, demand regions, and large mapped loads. It does not show every local distribution feeder.",
    citations: [CITATIONS.transmission, CITATIONS.substations],
    action: { type: "show_layer", target: "transmission" },
    followUps: ["substations_meaning", "why_data_centers_matter", "grid_signals"]
  },
  fuel_filters: {
    label: "How should I use fuel filters?",
    answer: () => "Fuel filters help you isolate the generation types behind an area's power supply. Oil and gas, coal, and nuclear are useful starting categories because they often represent large dispatchable capacity. Wind, solar, hydro, and storage help show renewable and flexibility resources.\n\nThe counts in the layer panel are based on the current map view, so zooming changes what the filter totals mean.",
    citations: [CITATIONS.eia860],
    action: { type: "none", target: "" },
    followUps: ["map_overview", "state_analysis", "facility_source"]
  },
  facility_source: {
    label: "Which source supports selected details?",
    answer: ({ selectedFeature }) => {
      if (!selectedFeature) return "Select a plant, data center, transmission line, substation, or place on the map first. The details panel will show source and confidence notes for that feature.";
      if (selectedFeature.type === "power_plant") return `${selectedFeature.name} uses EIA power-plant data for plant code, location, primary fuel, utility name, and capacity fields. The map marker layer uses the 2025 early release, so it should be treated as preliminary for official aggregation.`;
      if (selectedFeature.type === "data_center") return `${selectedFeature.name} comes from OpenStreetMap community-reported data. That means it is useful for discovery, but coverage can be incomplete and facility capacity is usually not publicly reported.`;
      if (selectedFeature.type === "transmission_line") return `${selectedFeature.name} comes from the public transmission-line service. Voltage, owner, status, and endpoints can be missing or inferred in the source.`;
      if (selectedFeature.type === "substation") return `${selectedFeature.name} is sourced from the substation layer. The dataset mainly represents transmission-associated substations and does not guarantee complete lower-voltage coverage.`;
      return `${selectedFeature.name} is a map navigation result, not an infrastructure asset record.`;
    },
    citations: [CITATIONS.eia860, CITATIONS.osm, CITATIONS.transmission, CITATIONS.substations],
    action: { type: "none", target: "" },
    followUps: ["nearby_layer", "map_overview", "data_center_coverage"]
  },
  selected_feature: {
    label: "What does the selected feature mean?",
    answer: ({ selectedFeature }) => {
      if (!selectedFeature) return "Select a map feature first, then this answer will explain what that feature represents and which source supports it.";
      const props = selectedFeature.properties ?? {};
      if (selectedFeature.type === "power_plant") {
        const capacity = props.operatingCapacityMw ? `${formatCount(props.operatingCapacityMw)} MW operating capacity` : "capacity not reported";
        return `${selectedFeature.name} is a power plant record. It is tagged as ${formatLabel(props.primaryFuel)} and has ${capacity}. Use it as a facility-level clue, not as an official national total.`;
      }
      if (selectedFeature.type === "data_center") return `${selectedFeature.name} is a mapped data-center location. The record can help identify facility presence, operator clues, and geography, but OpenStreetMap coverage is community-maintained and may be incomplete.`;
      if (selectedFeature.type === "transmission_line") return `${selectedFeature.name} is a transmission segment. Its voltage class helps show how much of the visible network is high-voltage backbone versus lower-voltage regional infrastructure.`;
      if (selectedFeature.type === "substation") return `${selectedFeature.name} is a substation point. Substations connect grid equipment and often mark where voltage changes or multiple lines meet.`;
      return `${selectedFeature.name} is a place search result used to move the map.`;
    },
    citations: [CITATIONS.eia860, CITATIONS.osm, CITATIONS.transmission, CITATIONS.substations],
    action: { type: "none", target: "" },
    followUps: ["facility_source", "nearby_layer", "show_transmission"]
  },
  nearby_layer: {
    label: "What nearby layer should I inspect?",
    answer: ({ selectedFeature }) => {
      if (!selectedFeature) return "Start with transmission lines near the area you are viewing. Then add substations if you want to understand connection points and nearby grid infrastructure.";
      if (selectedFeature.type === "data_center") return "For a data center, inspect nearby transmission lines and substations. Those layers help show whether the area is close to high-voltage infrastructure, although they do not prove the facility's exact interconnection path.";
      if (selectedFeature.type === "power_plant") return "For a power plant, inspect nearby transmission lines and substations. That helps show how generation may connect to the broader grid.";
      return "Transmission lines are the best next layer for most map questions, followed by substations when you zoom in.";
    },
    citations: [CITATIONS.transmission, CITATIONS.substations],
    action: { type: "show_layer", target: "transmission" },
    followUps: ["substations_meaning", "facility_source", "power_to_city"]
  },
  data_center_coverage: {
    label: "Why are data centers incomplete?",
    answer: () => "The data-center layer currently uses OpenStreetMap community-reported features. That makes it useful for discovery and mapping known facilities, but missing records do not mean an area has no data centers.\n\nFor a complete commercial inventory, the project would need parcel records, company disclosures, permits, interconnection queues, local news, and utility planning documents.",
    citations: [CITATIONS.osm],
    action: { type: "none", target: "" },
    followUps: ["why_data_centers_matter", "watch_page", "map_overview"]
  },
  why_data_centers_matter: {
    label: "Why do data centers matter for the grid?",
    answer: () => "Data centers can add large, concentrated electricity demand. When many projects cluster in one region, utilities and grid operators may need new substations, transmission upgrades, generation resources, or rate-design changes.\n\nThat is why US Grid Explorer connects facility locations with power plants, grid regions, transmission, and public policy signals.",
    citations: [CITATIONS.eia930, CITATIONS.transmission],
    action: { type: "select_view", target: "data_center_watch" },
    followUps: ["watch_page", "grid_signals", "data_center_coverage"]
  },
  grid_signals: {
    label: "What are Grid Signals?",
    views: ["signals"],
    answer: () => "Grid Signals show hourly demand reported by major balancing authorities through EIA-930. Demand is not the same as generation: it is the amount of electricity being served during the reported hour.\n\nThese values are useful for context, but they are preliminary operating data and can change.",
    citations: [CITATIONS.eia930],
    action: { type: "select_view", target: "signals" },
    followUps: ["balancing_authority", "state_analysis", "why_data_centers_matter"]
  },
  balancing_authority: {
    label: "What is a balancing authority?",
    views: ["signals"],
    answer: () => "A balancing authority is responsible for balancing electricity supply and demand in a defined area. It monitors demand, coordinates generation, and helps maintain reliability.\n\nExamples shown in this app include PJM, ERCOT, MISO, CAISO, NYISO, ISO-NE, and SPP.",
    citations: [CITATIONS.eia930],
    action: { type: "select_view", target: "signals" },
    followUps: ["grid_signals", "state_analysis", "power_to_city"]
  },
  state_analysis: {
    label: "Why use finalized 2024 data in Analysis?",
    views: ["analysis"],
    answer: () => "The map marker layer uses EIA-860 2025 Early Release records, which are preliminary. The Analysis view uses finalized 2024 EIA-860 aggregates because state comparisons need a more stable source.\n\nThat split keeps the map fresh while keeping comparisons more defensible.",
    citations: [CITATIONS.eia860],
    action: { type: "select_view", target: "analysis" },
    followUps: ["fuel_filters", "grid_signals", "facility_source"]
  },
  learn_start: {
    label: "Which lesson should I start with?",
    views: ["learn"],
    answer: () => "Start with the grid basics lesson if you are new to power systems. Then move to transmission voltage, substations, and data-center demand. Those concepts make the map easier to read.",
    citations: [],
    action: { type: "select_view", target: "learn" },
    followUps: ["power_to_city", "substations_meaning", "why_data_centers_matter"]
  },
  substations_meaning: {
    label: "What do substations mean?",
    answer: () => "Substations are grid connection points where equipment switches, protects, or changes voltage. They are important because they often mark where transmission lines meet, where power steps down toward local systems, or where large loads may connect.\n\nThe substation layer is useful context, not proof of a specific facility interconnection.",
    citations: [CITATIONS.substations],
    action: { type: "show_layer", target: "substations" },
    followUps: ["power_to_city", "show_transmission", "nearby_layer"]
  },
  watch_page: {
    label: "What is Data Center Watch?",
    views: ["data_center_watch"],
    answer: () => "Data Center Watch tracks public signals that may affect data-center growth and grid planning. The current live feed uses Federal Register records and turns source metadata into short monitoring cards.\n\nIt is a watchlist, not a complete news database. The goal is to identify signals worth verifying and expanding.",
    citations: [],
    action: { type: "select_view", target: "data_center_watch" },
    followUps: ["why_data_centers_matter", "data_center_coverage", "grid_signals"]
  }
};

export default function GridGuide({
  activeView,
  selectedFeature,
  counts,
  layers,
  onApplyAction
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const choices = useMemo(() => guideChoices(activeView, selectedFeature), [activeView, selectedFeature]);

  function askGuide(answerId) {
    const answer = GUIDE_ANSWERS[answerId];
    if (!answer) return;

    const context = { activeView, selectedFeature: compactFeature(selectedFeature), counts, layers };
    const userMessage = { role: "user", text: answer.label };
    const assistantMessage = {
      role: "assistant",
      text: answer.answer(context),
      citations: answer.citations,
      action: answer.action,
      followUps: answer.followUps
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
  }

  return (
    <div className={`grid-guide ${open ? "open" : ""}`}>
      {!open && (
        <button className="guide-launch" onClick={() => setOpen(true)}>
          <span><Sparkles size={17} /></span>
          <b>Ask Grid Guide</b>
        </button>
      )}

      {open && (
        <section className="guide-panel">
          <header>
            <div><span><Zap size={17} /></span><div><strong>Grid Guide</strong><small>Prebuilt source guide</small></div></div>
            <button onClick={() => setOpen(false)} aria-label="Close Grid Guide"><X size={17} /></button>
          </header>

          <div className="guide-context">
            <span>Viewing: <b>{formatLabel(activeView)}</b></span>
            {selectedFeature && <span>Selected: <b>{selectedFeature.name}</b></span>}
          </div>

          <div className="guide-messages">
            {messages.map((message, index) => (
              <article key={index} className={`guide-message ${message.role}`}>
                <p>{message.text}</p>
                {message.citations?.length > 0 && (
                  <div className="guide-citations">
                    {message.citations.map((citation) => <a key={citation.url} href={citation.url} target="_blank" rel="noreferrer"><ExternalLink size={11} />{citation.label}</a>)}
                  </div>
                )}
                {message.action?.type && message.action.type !== "none" && (
                  <button className="guide-action" onClick={() => onApplyAction(message.action)}>Apply: {actionLabel(message.action)}<ArrowUpRight size={13} /></button>
                )}
                {message.followUps?.length > 0 && (
                  <div className="guide-followups">{message.followUps.map((followUp) => <button key={followUp} onClick={() => askGuide(followUp)}>{GUIDE_ANSWERS[followUp]?.label ?? followUp}</button>)}</div>
                )}
              </article>
            ))}
          </div>

          <div className="guide-question-bank">
            <span>Choose a question</span>
            <div>{choices.map((choice) => <button key={choice} onClick={() => askGuide(choice)}>{GUIDE_ANSWERS[choice].label}</button>)}</div>
          </div>

          <footer><MessageCircle size={11} />Prebuilt answers do not use the OpenAI API.</footer>
        </section>
      )}
    </div>
  );
}

function guideChoices(activeView, selectedFeature) {
  const base = selectedFeature
    ? ["selected_feature", "facility_source", "nearby_layer", "show_transmission", "substations_meaning"]
    : ["map_overview", "power_to_city", "show_transmission", "fuel_filters", "data_center_coverage", "why_data_centers_matter"];

  const viewChoices = Object.entries(GUIDE_ANSWERS)
    .filter(([, answer]) => answer.views?.includes(activeView))
    .map(([id]) => id);

  return [...new Set([...viewChoices, ...base])].slice(0, 8);
}

function actionLabel(action) {
  if (action.type === "show_layer") return `show ${formatLabel(action.target)}`;
  if (action.type === "select_view") return `open ${formatLabel(action.target)}`;
  return "suggestion";
}

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString() : "0";
}

function compactFeature(feature) {
  if (!feature) return null;
  const properties = {};
  for (const key of [
    "plantCode", "utilityName", "city", "county", "state", "primaryFuel",
    "operatingCapacityMw", "proposedCapacityMw", "balancingAuthorityName",
    "operator", "status", "voltage", "voltageClass", "owner", "maxVoltage",
    "minVoltage", "lines", "addressType", "postalCode", "score"
  ]) {
    const value = feature.properties?.[key];
    if (["string", "number", "boolean"].includes(typeof value)) properties[key] = value;
  }
  return {
    id: feature.id,
    type: feature.type,
    name: feature.name,
    sourceRef: feature.sourceRef,
    properties
  };
}
