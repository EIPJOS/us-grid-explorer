/**
 * @typedef {Object} DataCenterWatchItem
 * @property {string} id
 * @property {string} title
 * @property {string} sourceName
 * @property {"government" | "regulation" | "grid_data" | "news" | "company" | "local_permit"} sourceType
 * @property {string} url
 * @property {string=} publishedDate
 * @property {string=} state
 * @property {string=} county
 * @property {string=} city
 * @property {string=} agency
 * @property {string[]=} companyNames
 * @property {string[]=} utilityNames
 * @property {string=} isoRto
 * @property {number=} capacityMw
 * @property {number=} estimatedPowerDemandMw
 * @property {string[]} tags
 * @property {string} summary
 * @property {number} importanceScore
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/** @type {DataCenterWatchItem[]} */
export const dataCenterWatchItems = [
  {
    id: "ferc-large-load-planning-pjm-2026",
    title: "FERC proceeding highlights large-load interconnection pressure in PJM",
    sourceName: "FERC eLibrary",
    sourceType: "regulation",
    url: "https://elibrary.ferc.gov/eLibrary/search",
    publishedDate: "2026-06-12",
    state: "VA",
    agency: "Federal Energy Regulatory Commission",
    utilityNames: ["Dominion Energy"],
    isoRto: "PJM",
    tags: ["large_load_interconnection", "transmission_upgrade", "ferc_order", "state_policy"],
    summary: "A FERC docket includes filings on how large-load customers are affecting interconnection, transmission planning, and cost allocation in PJM territory.",
    importanceScore: 96,
    createdAt: "2026-06-20T14:00:00Z",
    updatedAt: "2026-06-20T14:00:00Z"
  },
  {
    id: "federal-register-grid-reliability-notice-2026",
    title: "Federal notice requests comment on electric reliability and fast-growing loads",
    sourceName: "Federal Register",
    sourceType: "government",
    url: "https://www.federalregister.gov/",
    publishedDate: "2026-06-06",
    agency: "U.S. Department of Energy",
    tags: ["state_policy", "large_load_interconnection", "transmission_upgrade"],
    summary: "A federal notice seeks input on reliability risks from rapid demand growth, with data centers and electrification named as planning concerns.",
    importanceScore: 91,
    createdAt: "2026-06-20T14:05:00Z",
    updatedAt: "2026-06-20T14:05:00Z"
  },
  {
    id: "virginia-scc-dominion-rate-case-data-centers",
    title: "Virginia SCC rate case reviews data-center-driven grid investment",
    sourceName: "Virginia State Corporation Commission",
    sourceType: "regulation",
    url: "https://www.scc.virginia.gov/",
    publishedDate: "2026-05-29",
    state: "VA",
    agency: "Virginia SCC",
    utilityNames: ["Dominion Energy"],
    isoRto: "PJM",
    estimatedPowerDemandMw: 1200,
    tags: ["utility_rate_case", "electricity_price", "large_load_interconnection", "transmission_upgrade"],
    summary: "State regulators are reviewing utility spending tied to new large-load requests, including cost recovery and ratepayer protections.",
    importanceScore: 94,
    createdAt: "2026-06-20T14:08:00Z",
    updatedAt: "2026-06-20T14:08:00Z"
  },
  {
    id: "loudoun-zoning-data-center-overlay",
    title: "Loudoun County considers data center zoning overlay updates",
    sourceName: "Loudoun County Planning and Zoning",
    sourceType: "local_permit",
    url: "https://www.loudoun.gov/",
    publishedDate: "2026-05-21",
    state: "VA",
    county: "Loudoun",
    city: "Ashburn",
    tags: ["zoning", "data_center_project", "water_use", "tax_incentive"],
    summary: "County planning materials point to possible changes in where new data centers can locate and what infrastructure impacts must be disclosed.",
    importanceScore: 89,
    createdAt: "2026-06-20T14:12:00Z",
    updatedAt: "2026-06-20T14:12:00Z"
  },
  {
    id: "virginia-deq-backup-generator-air-permit",
    title: "Virginia DEQ permit filing covers backup generators for data center campus",
    sourceName: "Virginia DEQ",
    sourceType: "government",
    url: "https://www.deq.virginia.gov/",
    publishedDate: "2026-05-18",
    state: "VA",
    county: "Prince William",
    agency: "Virginia Department of Environmental Quality",
    capacityMw: 180,
    tags: ["air_permit", "data_center_project", "natural_gas"],
    summary: "A state air-permit notice references emergency generation for a proposed data center campus, offering a signal of potential backup-power scale.",
    importanceScore: 82,
    createdAt: "2026-06-20T14:15:00Z",
    updatedAt: "2026-06-20T14:15:00Z"
  },
  {
    id: "pjm-transmission-upgrade-large-loads",
    title: "PJM transmission upgrade package flags large-load growth in Northern Virginia",
    sourceName: "PJM Data Miner",
    sourceType: "grid_data",
    url: "https://dataminer2.pjm.com/",
    publishedDate: "2026-05-12",
    state: "VA",
    isoRto: "PJM",
    utilityNames: ["Dominion Energy"],
    capacityMw: 500,
    tags: ["transmission_upgrade", "large_load_interconnection", "data_center_project"],
    summary: "Transmission planning records identify upgrades associated with higher load forecasts in areas with concentrated data center demand.",
    importanceScore: 93,
    createdAt: "2026-06-20T14:20:00Z",
    updatedAt: "2026-06-20T14:20:00Z"
  },
  {
    id: "ercot-demand-growth-large-load-forecast",
    title: "ERCOT demand forecast shows rapid growth from large loads",
    sourceName: "ERCOT Market Information",
    sourceType: "grid_data",
    url: "https://www.ercot.com/mp/data-products",
    publishedDate: "2026-05-09",
    state: "TX",
    isoRto: "ERCOT",
    estimatedPowerDemandMw: 4800,
    tags: ["large_load_interconnection", "electricity_price", "natural_gas", "battery_storage"],
    summary: "ERCOT planning data highlights rising load expectations tied to data centers, industrial electrification, and energy-intensive computing.",
    importanceScore: 90,
    createdAt: "2026-06-20T14:25:00Z",
    updatedAt: "2026-06-20T14:25:00Z"
  },
  {
    id: "caiso-summer-reliability-data-center-load",
    title: "CAISO reliability update notes load growth and resource adequacy pressure",
    sourceName: "CAISO OASIS",
    sourceType: "grid_data",
    url: "http://oasis.caiso.com/",
    publishedDate: "2026-05-02",
    state: "CA",
    isoRto: "CAISO",
    tags: ["state_policy", "battery_storage", "renewables", "electricity_price"],
    summary: "California reliability materials point to the importance of flexible resources as new computing and industrial loads reshape peak planning.",
    importanceScore: 76,
    createdAt: "2026-06-20T14:30:00Z",
    updatedAt: "2026-06-20T14:30:00Z"
  },
  {
    id: "eia-electricity-demand-industrial-loads",
    title: "EIA data shows industrial electricity demand growth in data center states",
    sourceName: "EIA API",
    sourceType: "grid_data",
    url: "https://www.eia.gov/opendata/",
    publishedDate: "2026-04-30",
    tags: ["electricity_price", "large_load_interconnection", "state_policy"],
    summary: "Recent EIA electricity data can be used to compare industrial and commercial demand trends across fast-growing data center states.",
    importanceScore: 84,
    createdAt: "2026-06-20T14:35:00Z",
    updatedAt: "2026-06-20T14:35:00Z"
  },
  {
    id: "hyperscaler-ohio-campus-expansion",
    title: "Hyperscaler announces expanded Ohio data center campus",
    sourceName: "Company press releases",
    sourceType: "company",
    url: "https://www.prnewswire.com/",
    publishedDate: "2026-04-25",
    state: "OH",
    county: "Franklin",
    city: "Columbus",
    companyNames: ["Confidential hyperscale operator"],
    utilityNames: ["AEP Ohio"],
    isoRto: "PJM",
    estimatedPowerDemandMw: 350,
    tags: ["hyperscaler", "data_center_project", "large_load_interconnection", "tax_incentive"],
    summary: "A company announcement describes a larger Midwest cloud campus, raising questions about utility service, transmission capacity, and incentives.",
    importanceScore: 80,
    createdAt: "2026-06-20T14:40:00Z",
    updatedAt: "2026-06-20T14:40:00Z"
  },
  {
    id: "utility-dive-large-load-tariff",
    title: "Utility Dive covers proposed large-load tariff for data centers",
    sourceName: "Utility Dive",
    sourceType: "news",
    url: "https://www.utilitydive.com/",
    publishedDate: "2026-04-19",
    state: "GA",
    utilityNames: ["Georgia Power"],
    tags: ["utility_rate_case", "electricity_price", "state_policy", "hyperscaler"],
    summary: "A utility-policy article explains how special tariffs could assign more grid costs to very large new customers.",
    importanceScore: 86,
    createdAt: "2026-06-20T14:45:00Z",
    updatedAt: "2026-06-20T14:45:00Z"
  },
  {
    id: "data-center-frontier-phoenix-power",
    title: "Data Center Frontier reports Phoenix project tied to power availability",
    sourceName: "Data Center Frontier",
    sourceType: "news",
    url: "https://www.datacenterfrontier.com/",
    publishedDate: "2026-04-11",
    state: "AZ",
    county: "Maricopa",
    city: "Phoenix",
    tags: ["data_center_project", "hyperscaler", "water_use", "renewables"],
    summary: "Project coverage highlights the role of power access, land, and cooling constraints in the Phoenix data center market.",
    importanceScore: 74,
    createdAt: "2026-06-20T14:50:00Z",
    updatedAt: "2026-06-20T14:50:00Z"
  },
  {
    id: "bisnow-tax-incentive-data-center-texas",
    title: "Texas county reviews tax incentives for proposed data center campus",
    sourceName: "Bisnow Data Center",
    sourceType: "news",
    url: "https://www.bisnow.com/data-center",
    publishedDate: "2026-04-05",
    state: "TX",
    county: "Ellis",
    tags: ["tax_incentive", "data_center_project", "zoning", "natural_gas"],
    summary: "Local real-estate coverage points to incentive negotiations and infrastructure commitments for a possible Texas data center campus.",
    importanceScore: 70,
    createdAt: "2026-06-20T14:55:00Z",
    updatedAt: "2026-06-20T14:55:00Z"
  },
  {
    id: "rto-insider-pjm-large-load-cost-allocation",
    title: "RTO Insider tracks PJM debate over large-load cost allocation",
    sourceName: "RTO Insider",
    sourceType: "news",
    url: "https://www.rtoinsider.com/",
    publishedDate: "2026-03-28",
    isoRto: "PJM",
    tags: ["ferc_order", "transmission_upgrade", "electricity_price", "large_load_interconnection"],
    summary: "Regional-market reporting follows debates over who pays when new data center load accelerates network upgrades.",
    importanceScore: 88,
    createdAt: "2026-06-20T15:00:00Z",
    updatedAt: "2026-06-20T15:00:00Z"
  },
  {
    id: "doe-ai-energy-infrastructure-announcement",
    title: "DOE announces effort to study AI infrastructure and grid planning",
    sourceName: "U.S. Department of Energy",
    sourceType: "government",
    url: "https://www.energy.gov/newsroom",
    publishedDate: "2026-03-22",
    agency: "U.S. Department of Energy",
    tags: ["state_policy", "hyperscaler", "nuclear_power", "renewables", "battery_storage"],
    summary: "DOE materials describe a federal push to understand AI infrastructure demand and align new load with reliability and clean-energy planning.",
    importanceScore: 85,
    createdAt: "2026-06-20T15:05:00Z",
    updatedAt: "2026-06-20T15:05:00Z"
  }
];
