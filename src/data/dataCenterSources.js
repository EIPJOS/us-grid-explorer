export const DATA_CENTER_SOURCE_CATEGORIES = {
  government: "Government",
  regulation: "Regulation",
  grid_data: "Grid / energy data",
  news: "Industry news",
  company: "Company",
  local_permit: "Local permit"
};

export const dataCenterSources = [
  {
    name: "Federal Register",
    category: "government",
    baseUrl: "https://www.federalregister.gov/",
    apiAvailable: true,
    notes: "Useful for proposed rules, final rules, notices, and agency announcements.",
    suggestedKeywords: ["data center", "large load", "electric reliability", "transmission planning", "interconnection", "electricity demand"]
  },
  {
    name: "Regulations.gov",
    category: "regulation",
    baseUrl: "https://www.regulations.gov/",
    apiAvailable: true,
    notes: "Tracks federal dockets, public comments, notices, and agency rulemaking material.",
    suggestedKeywords: ["data center", "electric reliability", "air permit", "water use", "grid planning"]
  },
  {
    name: "FERC eLibrary",
    category: "regulation",
    baseUrl: "https://elibrary.ferc.gov/eLibrary/search",
    apiAvailable: false,
    notes: "Important for filings, orders, proceedings, and transmission/interconnection cases.",
    suggestedKeywords: ["large load", "interconnection", "transmission planning", "PJM", "hyperscale"]
  },
  {
    name: "U.S. Department of Energy",
    category: "government",
    baseUrl: "https://www.energy.gov/newsroom",
    apiAvailable: false,
    notes: "Announcements on grid investment, reliability, transmission, AI energy policy, and federal programs.",
    suggestedKeywords: ["grid modernization", "AI data centers", "transmission", "electricity demand", "reliability"]
  },
  {
    name: "U.S. Environmental Protection Agency",
    category: "government",
    baseUrl: "https://www.epa.gov/newsroom",
    apiAvailable: false,
    notes: "Useful for air, water, emissions, and permitting context related to backup generation and industrial load.",
    suggestedKeywords: ["backup generators", "air permit", "NOx", "data center", "water use"]
  },
  {
    name: "Virginia State Corporation Commission",
    category: "regulation",
    baseUrl: "https://www.scc.virginia.gov/",
    apiAvailable: false,
    notes: "Virginia utility cases and rate proceedings are central to data-center-driven grid planning.",
    suggestedKeywords: ["Dominion", "data center", "large load", "transmission", "rate case"]
  },
  {
    name: "Loudoun County Planning and Zoning",
    category: "local_permit",
    baseUrl: "https://www.loudoun.gov/",
    apiAvailable: false,
    notes: "County zoning and land-use materials show local data center policy pressure in Data Center Alley.",
    suggestedKeywords: ["data center", "zoning", "special exception", "substation", "noise"]
  },
  {
    name: "EIA API",
    category: "grid_data",
    baseUrl: "https://www.eia.gov/opendata/",
    apiAvailable: true,
    notes: "Official electricity demand, generation, fuel, price, and capacity datasets.",
    suggestedKeywords: ["electricity demand", "retail sales", "capacity", "generation", "industrial load"]
  },
  {
    name: "PJM Data Miner",
    category: "grid_data",
    baseUrl: "https://dataminer2.pjm.com/",
    apiAvailable: true,
    notes: "PJM load, transmission, queue, price, and reliability data for the largest data-center region.",
    suggestedKeywords: ["load forecast", "transmission", "queue", "large load", "Dominion"]
  },
  {
    name: "ERCOT Market Information",
    category: "grid_data",
    baseUrl: "https://www.ercot.com/mp/data-products",
    apiAvailable: true,
    notes: "Texas load, interconnection, price, and demand-growth data.",
    suggestedKeywords: ["large load", "demand growth", "West Texas", "load forecast", "interconnection"]
  },
  {
    name: "CAISO OASIS",
    category: "grid_data",
    baseUrl: "http://oasis.caiso.com/",
    apiAvailable: true,
    notes: "California market, load, transmission, and reliability data.",
    suggestedKeywords: ["load forecast", "transmission constraint", "reliability", "queue", "storage"]
  },
  {
    name: "GridStatus",
    category: "grid_data",
    baseUrl: "https://www.gridstatus.io/",
    apiAvailable: true,
    notes: "Aggregated grid and market data that can speed up multi-ISO comparisons.",
    suggestedKeywords: ["load", "price", "fuel mix", "outage", "ISO"]
  },
  {
    name: "Data Center Dynamics",
    category: "news",
    baseUrl: "https://www.datacenterdynamics.com/",
    apiAvailable: false,
    notes: "Industry reporting on data center projects, companies, power procurement, and policy.",
    suggestedKeywords: ["data center", "power", "campus", "AI", "utility"]
  },
  {
    name: "Data Center Frontier",
    category: "news",
    baseUrl: "https://www.datacenterfrontier.com/",
    apiAvailable: false,
    notes: "Industry project and market coverage, especially hyperscale expansion and energy sourcing.",
    suggestedKeywords: ["hyperscale", "campus", "power", "Virginia", "Texas"]
  },
  {
    name: "Data Center Knowledge",
    category: "news",
    baseUrl: "https://www.datacenterknowledge.com/",
    apiAvailable: false,
    notes: "Industry news and analysis on operators, infrastructure, power, and cloud demand.",
    suggestedKeywords: ["AI", "data center", "energy", "cloud", "capacity"]
  },
  {
    name: "Utility Dive",
    category: "news",
    baseUrl: "https://www.utilitydive.com/",
    apiAvailable: false,
    notes: "Utility, regulatory, rate, and planning coverage that often connects large loads to grid cost.",
    suggestedKeywords: ["data center", "large load", "utility rates", "transmission", "resource planning"]
  },
  {
    name: "Bisnow Data Center",
    category: "news",
    baseUrl: "https://www.bisnow.com/data-center",
    apiAvailable: false,
    notes: "Real-estate-focused reporting on markets, sites, operators, and local development fights.",
    suggestedKeywords: ["data center", "zoning", "campus", "tax incentive", "land"]
  },
  {
    name: "RTO Insider",
    category: "news",
    baseUrl: "https://www.rtoinsider.com/",
    apiAvailable: false,
    notes: "Useful for ISO/RTO, FERC, planning, reliability, and state utility commission coverage.",
    suggestedKeywords: ["PJM", "large load", "FERC", "transmission", "reliability"]
  },
  {
    name: "Company press releases",
    category: "company",
    baseUrl: "https://www.prnewswire.com/",
    apiAvailable: false,
    notes: "Company announcements can provide project names, markets, capacity claims, and investment signals.",
    suggestedKeywords: ["data center campus", "AI infrastructure", "power purchase", "renewable energy", "expansion"]
  }
];
