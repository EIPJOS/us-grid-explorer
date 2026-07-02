/**
 * Curated briefs must link to the exact primary source used. `summary` records
 * what the source says; `whyItMatters` is US Grid Explorer's interpretation.
 */
export const dataCenterWatchItems = [
  {
    id: "ai-data-center-power-delivery-architecture-2026",
    title: "Next-generation AI data centers are pushing power-delivery design beyond 48V racks",
    sourceName: "arXiv",
    sourceType: "research",
    url: "https://arxiv.org/abs/2606.25095",
    publishedDate: "2026-06-23",
    tags: ["ai_data_center", "power_delivery", "grid_planning", "solid_state_transformer"],
    summary: "This review says AI workloads are stressing traditional 48V rack power, low-voltage AC distribution, and line-frequency transformer architectures. It highlights three technical building blocks for future facilities: high-voltage conversion-ratio DC/DC converters, facility-level low-voltage DC distribution, and medium-voltage solid-state transformers.",
    whyItMatters: "For site and grid planning, this means the power room is becoming a strategic design choice rather than a back-end utility. Facilities that adopt new power-delivery architectures may handle higher density loads more efficiently, but they also need more specialized electrical infrastructure and a closer relationship with the grid.",
    corroboratingSources: [
      {
        label: "DOE data center electricity demand report",
        url: "https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers"
      }
    ],
    importanceScore: 90,
    createdAt: "2026-07-01T15:00:00Z",
    updatedAt: "2026-07-01T15:00:00Z"
  },
  {
    id: "ai-data-centers-power-system-sustainability-2026",
    title: "Power-flexible AI data centers could become grid-responsive compute assets",
    sourceName: "arXiv",
    sourceType: "research",
    url: "https://arxiv.org/abs/2606.25098",
    publishedDate: "2026-06-23",
    tags: ["ai_data_center", "electricity_demand", "grid_planning", "load_flexibility"],
    summary: "The paper argues that modern GPU clusters can be treated as grid-interactive loads rather than fixed demand blocks. It describes an architecture that combines grid signals, workload scheduling, and power telemetry to shift or curtail compute when the system is stressed, and it reports experimental results on a 130 kW cluster.",
    whyItMatters: "This is important because it points to a possible path for easing data-center-driven grid pressure: if operators can throttle or move workloads intelligently, some new demand may be served with less transmission and interconnection friction.",
    corroboratingSources: [
      {
        label: "DOE data center electricity demand report",
        url: "https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers"
      }
    ],
    importanceScore: 91,
    createdAt: "2026-07-01T14:00:00Z",
    updatedAt: "2026-07-01T14:00:00Z"
  },
  {
    id: "federal-nuclear-push-ai-power-2026",
    title: "Federal nuclear push expands as AI power demand rises",
    sourceName: "Fox45 / The National News Desk",
    sourceType: "news",
    url: "https://foxbaltimore.com/news/nation-world/white-house-ramps-up-nuclear-power-push-as-ai-driven-energy-demand-surges-energy-secretary-texas-army-reactors",
    publishedDate: "2026-06-26",
    agency: "U.S. Department of Energy",
    tags: ["nuclear_power", "electricity_demand", "data_center_project", "federal_policy"],
    summary: "Federal officials are promoting large reactors, small modular reactors, and microreactors as electricity demand grows alongside AI infrastructure. A related DOE announcement offers $17.5 billion in financing intended to accelerate work on 10 large commercial reactors.",
    whyItMatters: "Nuclear projects take years to license and build, so this does not solve near-term interconnection constraints. It does show that expected data-center demand is influencing federal generation policy and long-range capacity planning.",
    corroboratingSources: [
      {
        label: "DOE financing announcement",
        url: "https://www.energy.gov/articles/department-energy-announces-american-nuclear-supply-chain-loans"
      },
      {
        label: "White House advanced-reactor order",
        url: "https://www.whitehouse.gov/presidential-actions/2025/05/deploying-advanced-nuclear-reactor-technologies-for-national-security/"
      }
    ],
    importanceScore: 95,
    createdAt: "2026-06-30T15:00:00Z",
    updatedAt: "2026-06-30T15:00:00Z"
  },
  {
    id: "ferc-pjm-colocation-review-2025",
    title: "FERC opens review of data-center co-location rules in PJM",
    sourceName: "Federal Energy Regulatory Commission",
    sourceType: "regulation",
    url: "https://ferc.gov/news-events/news/ferc-orders-action-co-location-issues-related-data-centers-running-ai",
    publishedDate: "2025-02-20",
    agency: "Federal Energy Regulatory Commission",
    isoRto: "PJM",
    tags: ["data_center_project", "large_load_interconnection", "ferc_order", "electricity_price"],
    summary: "FERC launched a proceeding to examine whether PJM's tariff adequately addresses large loads located beside power plants. The review focuses on reliability, service terms, and how grid costs are assigned.",
    whyItMatters: "The outcome can influence how quickly very large data centers obtain power in the nation's largest wholesale grid and which costs fall on the project versus other customers.",
    importanceScore: 96,
    createdAt: "2026-06-30T12:00:00Z",
    updatedAt: "2026-06-30T12:00:00Z"
  },
  {
    id: "doe-us-data-center-energy-use-2024",
    title: "DOE projects data centers could use up to 12% of U.S. electricity by 2028",
    sourceName: "U.S. Department of Energy",
    sourceType: "government",
    url: "https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers",
    publishedDate: "2024-12-20",
    agency: "U.S. Department of Energy",
    tags: ["electricity_demand", "grid_planning", "data_center_project", "energy_storage"],
    summary: "DOE's summary of a Lawrence Berkeley National Laboratory report estimates that U.S. data centers used about 176 TWh in 2023, or 4.4% of national electricity, and could use 325 to 580 TWh in 2028.",
    whyItMatters: "This national range explains why utilities are revising load forecasts and why generation, transmission, storage, and flexible demand belong beside construction records in this tracker.",
    importanceScore: 94,
    createdAt: "2026-06-30T12:05:00Z",
    updatedAt: "2026-06-30T12:05:00Z"
  },
  {
    id: "pjm-load-forecast-data-center-2026",
    title: "PJM publishes 2026 long-term load forecast and data-center accuracy resources",
    sourceName: "PJM Interconnection",
    sourceType: "grid_data",
    url: "https://www.pjm.com/en/planning/resource-adequacy-planning/load-forecast-dev-process",
    publishedDate: "2026-02-06",
    isoRto: "PJM",
    tags: ["load_forecast", "large_load_interconnection", "grid_planning", "data_center_project"],
    summary: "PJM's load-forecast resource page provides its 2026 long-term forecast, downloadable tables and data, load-adjustment materials, and a dedicated data-center accuracy report.",
    whyItMatters: "Forecast revisions are an early signal of where proposed computing loads may require new capacity or transmission, but they are not proof that every proposed facility will be built.",
    importanceScore: 92,
    createdAt: "2026-06-30T12:10:00Z",
    updatedAt: "2026-06-30T12:10:00Z"
  }
];
