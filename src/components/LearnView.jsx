import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Database,
  Network,
  Radio,
  Server,
  Sparkles,
  Zap
} from "lucide-react";

const LESSONS = [
  {
    id: "system",
    icon: Network,
    title: "The grid is a connected system",
    duration: "4 min",
    summary: "Follow electricity from generator to transmission line, substation, distribution network, and customer.",
    takeaway: "A power plant is only useful when the network can move its electricity to where demand occurs.",
    points: [
      "Generators convert fuel, sunlight, wind, water, or stored energy into electricity.",
      "High-voltage transmission moves bulk electricity over long distances.",
      "Substations switch circuits and transform voltage between parts of the network.",
      "Balancing authorities continuously match generation and demand."
    ]
  },
  {
    id: "generation",
    icon: Zap,
    title: "Plant count is not generation capacity",
    duration: "5 min",
    summary: "Learn why thousands of small solar facilities can coexist with a smaller number of very large nuclear or gas plants.",
    takeaway: "Always check whether a chart measures facility count, nameplate capacity, actual generation, or energy produced over time.",
    points: [
      "Nameplate capacity is the maximum rated output under specified conditions.",
      "Actual generation depends on weather, fuel, maintenance, economics, and dispatch.",
      "Capacity factor compares actual generation with continuous full-output operation.",
      "Our Explore markers use individual 2025 plant records; Analysis totals use finalized 2024 data."
    ]
  },
  {
    id: "transmission",
    icon: Network,
    title: "Voltage reveals the grid hierarchy",
    duration: "4 min",
    summary: "Use line voltage to distinguish the national backbone from regional and local transmission.",
    takeaway: "Higher voltage reduces current for the same power transfer, lowering resistive losses and enabling bulk movement.",
    points: [
      "500 kV and higher lines form major bulk-transfer corridors.",
      "345 kV and 230 kV networks connect large generation and regional load centers.",
      "Lower-voltage transmission becomes denser near cities and industrial areas.",
      "Map visibility changes with zoom so the national view remains readable."
    ]
  },
  {
    id: "substations",
    icon: Database,
    title: "Substations are network control points",
    duration: "4 min",
    summary: "Understand switching, voltage transformation, protection, and why substations cluster near load and line intersections.",
    takeaway: "A substation is not a power source. It is a control and transformation point in the network.",
    points: [
      "Transformers step voltage between transmission and distribution levels.",
      "Switchgear isolates faults and reroutes power during maintenance or emergencies.",
      "Voltage fields may be measured, reported, or inferred in public datasets.",
      "Our HIFLD layer primarily covers transmission-associated substations."
    ]
  },
  {
    id: "operations",
    icon: Radio,
    title: "Demand must be balanced every hour",
    duration: "5 min",
    summary: "Read the EIA-930 demand curves and learn how balancing authorities operate different parts of the U.S. grid.",
    takeaway: "There is no single U.S. grid operator; multiple balancing authorities coordinate within interconnected systems.",
    points: [
      "Demand rises and falls with weather, schedules, industry, and time of day.",
      "Operators commit and dispatch resources to maintain frequency and reliability.",
      "Interchange moves electricity between neighboring balancing authorities.",
      "Hourly data is preliminary and may be revised after publication."
    ]
  },
  {
    id: "datacenters",
    icon: Server,
    title: "Data centers become grid-scale loads",
    duration: "6 min",
    summary: "Explore why large computing campuses affect transmission planning, generation needs, permitting, and local infrastructure.",
    takeaway: "A mapped facility location does not reveal its actual electricity demand; capacity claims require a separate verified source.",
    points: [
      "Large campuses can request hundreds of megawatts of service.",
      "Fiber, land, taxes, water, permitting, and grid access all influence location.",
      "OpenStreetMap coverage is useful but incomplete and community-maintained.",
      "Responsible analysis separates verified capacity from modeled or unknown demand."
    ]
  }
];

export default function LearnView({ plants, dataCenters, fuelCounts }) {
  const [section, setSection] = useState("lessons");
  const [activeLesson, setActiveLesson] = useState(LESSONS[0].id);
  const [completed, setCompleted] = useState(() => readCompleted());

  const active = LESSONS.find((lesson) => lesson.id === activeLesson) ?? LESSONS[0];
  const storyStats = useMemo(() => buildStoryStats(plants, dataCenters, fuelCounts), [plants, dataCenters, fuelCounts]);

  function completeLesson(id) {
    const next = [...new Set([...completed, id])];
    setCompleted(next);
    localStorage.setItem("us-grid-learn-completed", JSON.stringify(next));
  }

  return (
    <main className="view-shell learn-view">
      <section className="view-heading learn-heading">
        <div>
          <span className="eyebrow">Interactive grid literacy</span>
          <h1>Learn the system behind the map</h1>
          <p>Build a practical mental model of generation, networks, operations, and emerging data-center demand.</p>
        </div>
        <div className="learn-tabs">
          <button className={section === "lessons" ? "active" : ""} onClick={() => setSection("lessons")}><BookOpen size={16} />Lessons</button>
          <button className={section === "stories" ? "active" : ""} onClick={() => setSection("stories")}><Sparkles size={16} />Data stories</button>
        </div>
      </section>

      {section === "lessons" ? (
        <section className="lesson-layout">
          <aside className="lesson-list">
            <div className="lesson-progress"><span>{completed.length} of {LESSONS.length} complete</span><i><b style={{ width: `${completed.length / LESSONS.length * 100}%` }}></b></i></div>
            {LESSONS.map((lesson, index) => {
              const Icon = lesson.icon;
              const isComplete = completed.includes(lesson.id);
              return (
                <button key={lesson.id} className={activeLesson === lesson.id ? "active" : ""} onClick={() => setActiveLesson(lesson.id)}>
                  <span className="lesson-number">{index + 1}</span>
                  <i><Icon size={17} /></i>
                  <span><strong>{lesson.title}</strong><small>{lesson.duration}</small></span>
                  {isComplete ? <CheckCircle2 className="complete" size={17} /> : <Circle size={17} />}
                </button>
              );
            })}
          </aside>

          <article className="lesson-content">
            <span className="eyebrow">Lesson {LESSONS.findIndex((lesson) => lesson.id === active.id) + 1}</span>
            <h2>{active.title}</h2>
            <p className="lesson-summary">{active.summary}</p>
            <div className="lesson-diagram">{lessonDiagram(active.id)}</div>
            <ul>{active.points.map((point) => <li key={point}>{point}</li>)}</ul>
            <blockquote><strong>Key takeaway</strong>{active.takeaway}</blockquote>
            <footer>
              <span>{active.duration} lesson</span>
              <button onClick={() => completeLesson(active.id)} disabled={completed.includes(active.id)}>{completed.includes(active.id) ? "Completed" : "Mark complete"}<CheckCircle2 size={15} /></button>
            </footer>
          </article>
        </section>
      ) : (
        <Stories stats={storyStats} />
      )}
    </main>
  );
}

function Stories({ stats }) {
  const stories = [
    {
      number: "01",
      title: "Compute meets the grid",
      kicker: `${stats.dataCenters.toLocaleString()} community-mapped data centers`,
      text: "Data centers are not generators. They are large, concentrated loads whose location can reshape utility forecasts, transmission plans, and generation investment.",
      bars: stats.topDataCenterStates
    },
    {
      number: "02",
      title: "A network hidden in plain sight",
      kicker: "130,000+ network features available",
      text: "Transmission lines move bulk power; substations switch and transform it. Voltage-aware rendering reveals the backbone nationally and local complexity as the map zooms.",
      bars: [
        { label: "Substations", value: 77946 },
        { label: "Line segments", value: 52244 }
      ]
    },
    {
      number: "03",
      title: "Facility count changes the picture",
      kicker: `${stats.plants.toLocaleString()} current plant markers`,
      text: "Solar leads the number of mapped plants, but count is not capacity or annual generation. Different measures answer different questions about the energy transition.",
      bars: stats.topFuels
    }
  ];

  return (
    <section className="stories-grid">
      {stories.map((story) => (
        <article key={story.number} className="story-card">
          <span className="story-number">{story.number}</span>
          <small>{story.kicker}</small>
          <h2>{story.title}</h2>
          <p>{story.text}</p>
          <div className="story-bars">{story.bars.map((bar) => <StoryBar key={bar.label} {...bar} max={Math.max(...story.bars.map((item) => item.value))} />)}</div>
          <footer><span>Explore the evidence in the map and Analysis tabs.</span><ArrowRight size={17} /></footer>
        </article>
      ))}
    </section>
  );
}

function StoryBar({ label, value, max }) {
  return <div><span><b>{label}</b><small>{value.toLocaleString()}</small></span><i><b style={{ width: `${Math.max(4, value / max * 100)}%` }}></b></i></div>;
}

function buildStoryStats(plants, dataCenters, fuelCounts) {
  const stateCounts = {};
  dataCenters.forEach((center) => {
    const state = center.properties.state;
    if (state) stateCounts[state] = (stateCounts[state] ?? 0) + 1;
  });
  return {
    plants: plants.length,
    dataCenters: dataCenters.length,
    topDataCenterStates: Object.entries(stateCounts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5),
    topFuels: Object.entries(fuelCounts).map(([label, value]) => ({ label: formatLabel(label), value })).sort((a, b) => b.value - a.value).slice(0, 5)
  };
}

function lessonDiagram(id) {
  if (id === "system") return <div className="system-flow"><span>Generation</span><ArrowRight /><span>Transmission</span><ArrowRight /><span>Substation</span><ArrowRight /><span>Demand</span></div>;
  if (id === "generation") return <div className="concept-pair"><span><b>Plant count</b>How many facilities?</span><span><b>Capacity</b>How much rated output?</span><span><b>Generation</b>How much energy produced?</span></div>;
  if (id === "transmission") return <div className="voltage-steps"><i className="high">500+ kV</i><i className="medium">230-499 kV</i><i className="low">Below 230 kV</i></div>;
  if (id === "substations") return <div className="substation-concept"><span>High voltage</span><Zap /><b>Switch + transform</b><Zap /><span>Lower voltage</span></div>;
  if (id === "operations") return <div className="balance-concept"><span>Generation</span><b>=</b><span>Demand + losses</span></div>;
  return <div className="concept-pair"><span><b>Compute</b>Concentrated load</span><span><b>Network</b>Available capacity</span><span><b>Planning</b>Years of lead time</span></div>;
}

function readCompleted() {
  try {
    return JSON.parse(localStorage.getItem("us-grid-learn-completed") || "[]");
  } catch {
    return [];
  }
}

function formatLabel(value) {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
