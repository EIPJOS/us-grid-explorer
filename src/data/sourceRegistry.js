const defaultsByTier = {
  1: { reliability_score: 92, paywall_risk: "low" },
  2: { reliability_score: 78, paywall_risk: "low" },
  3: { reliability_score: 68, paywall_risk: "medium" }
};

function source({ name, url, type, category, tier, method = "webpage_metadata", fullText = false, paywall, notes = "", enabled = false }) {
  const id = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id,
    source_name: name,
    source_url: url,
    source_type: type,
    category,
    tier,
    reliability_score: defaultsByTier[tier].reliability_score,
    fetch_method: method,
    allowed_to_fetch_full_text: fullText,
    paywall_risk: paywall ?? defaultsByTier[tier].paywall_risk,
    notes,
    enabled
  };
}

const tier1 = [
  ["U.S. Energy Information Administration", "https://www.eia.gov/todayinenergy/", "government", "government_energy", "Electricity demand, generation, prices, and energy statistics."],
  ["U.S. Department of Energy", "https://www.energy.gov/newsroom", "government", "government_energy", "Grid modernization, data-center demand, infrastructure, and funding."],
  ["Federal Energy Regulatory Commission", "https://www.ferc.gov/news-events/news", "government", "government_regulation", "Transmission, interconnection, rates, and reliability decisions."],
  ["EPA eGRID", "https://www.epa.gov/egrid", "government", "government_data", "Grid emissions, generation mix, and regional carbon intensity."],
  ["NREL", "https://www.nrel.gov/news", "research", "research_government", "Renewables, storage, grid modeling, and technical research."],
  ["Lawrence Berkeley National Laboratory", "https://newscenter.lbl.gov/", "research", "research_government", "Interconnection queues, efficiency, markets, and grid research."],
  ["NERC", "https://www.nerc.com/news/Pages/default.aspx", "research", "grid_reliability", "Reliability assessments and seasonal or long-term risk."],
  ["PJM Inside Lines", "https://insidelines.pjm.com/", "iso_rto", "iso_rto", "PJM load growth, transmission, capacity, and Northern Virginia."],
  ["ERCOT News", "https://www.ercot.com/news", "iso_rto", "iso_rto", "Texas load growth, generation, storage, and reliability."],
  ["CAISO News Releases", "https://www.caiso.com/about/news/news-releases", "iso_rto", "iso_rto", "California demand, storage, transmission, and reliability."],
  ["MISO Newsroom", "https://www.misoenergy.org/meet-miso/media-center/", "iso_rto", "iso_rto", "Midwest transmission, planning, and resource adequacy."],
  ["SPP Newsroom", "https://www.spp.org/newsroom/", "iso_rto", "iso_rto", "Great Plains transmission, wind, and resource adequacy."],
  ["NYISO News", "https://www.nyiso.com/news", "iso_rto", "iso_rto", "New York demand, transmission, markets, and reliability."],
  ["ISO New England Newswire", "https://www.iso-ne.com/about/news-media/press-releases", "iso_rto", "iso_rto", "New England transmission, demand, and reliability."],
  ["Dominion Energy Newsroom", "https://news.dominionenergy.com/", "utility", "utility", "Northern Virginia data-center demand and utility infrastructure."],
  ["Duke Energy Newsroom", "https://news.duke-energy.com/", "utility", "utility", "Carolinas and Midwest utility growth and infrastructure."],
  ["Southern Company Newsroom", "https://www.southerncompany.com/newsroom.html", "utility", "utility", "Southeast generation and grid infrastructure."],
  ["Georgia Power Newsroom", "https://www.georgiapower.com/company/news-center.html", "utility", "utility", "Georgia load growth, planning, and power projects."],
  ["Entergy Newsroom", "https://www.entergynewsroom.com/", "utility", "utility", "Gulf and Mid-South industrial and data-center load."],
  ["Oncor Newsroom", "https://www.oncor.com/content/oncorwww/us/en/home/newsroom.html", "utility", "utility", "Texas transmission and distribution investment."],
  ["AEP Newsroom", "https://www.aep.com/newsroom", "utility", "utility", "Midwest and Appalachia transmission and load growth."],
  ["FirstEnergy Newsroom", "https://www.firstenergycorp.com/newsroom.html", "utility", "utility", "PJM-region transmission and reliability."],
  ["Exelon Newsroom", "https://www.exeloncorp.com/newsroom", "utility", "utility", "Exelon, ComEd, PECO, and BGE metro utility developments."],
  ["NextEra Energy Newsroom", "https://newsroom.nexteraenergy.com/", "utility", "utility", "Florida grid, generation, renewables, and infrastructure."],
  ["Xcel Energy Newsroom", "https://newsroom.xcelenergy.com/", "utility", "utility", "Midwest and Colorado transmission and clean energy."],
  ["PG&E Newsroom", "https://www.pgecurrents.com/", "utility", "utility", "California load, transmission, and grid resilience."],
  ["Southern California Edison Newsroom", "https://energized.edison.com/", "utility", "utility", "California transmission, electrification, and resilience."],
  ["Con Edison Newsroom", "https://www.coned.com/en/about-us/media-center/news", "utility", "utility", "New York City demand and urban infrastructure."],
  ["PSEG Newsroom", "https://corporate.pseg.com/newsroom", "utility", "utility", "New Jersey generation and grid infrastructure."],
  ["Amazon and AWS News", "https://www.aboutamazon.com/news/aws", "press_release", "hyperscaler", "Cloud regions, data centers, and energy procurement."],
  ["Microsoft News and Azure Blog", "https://news.microsoft.com/source/topics/ai/", "press_release", "hyperscaler", "AI data centers, energy procurement, and infrastructure."],
  ["Google Data Centers", "https://datacenters.google/", "press_release", "hyperscaler", "Data-center locations, infrastructure, and clean energy."],
  ["Google Cloud Blog", "https://cloud.google.com/blog/", "company_blog", "hyperscaler", "Google Cloud updates and infrastructure announcements."],
  ["Google Sustainability", "https://sustainability.google/", "company_news", "hyperscaler", "Google clean energy, sustainability, and data-center efficiency."],
  ["Meta Newsroom", "https://about.fb.com/news/", "press_release", "hyperscaler", "Data-center campuses and energy procurement."],
  ["Meta Sustainability", "https://sustainability.atmeta.com/", "company_news", "hyperscaler", "Meta energy and sustainability updates."],
  ["Oracle Newsroom", "https://www.oracle.com/news/", "company_news", "hyperscaler", "Oracle cloud, AI, and infrastructure updates."],
  ["CoreWeave Newsroom", "https://www.coreweave.com/newsroom", "press_release", "ai_cloud", "GPU cloud infrastructure and data-center expansion."],
  ["OpenAI News", "https://openai.com/news/", "press_release", "ai_infrastructure", "Infrastructure partnerships and compute expansion."],
  ["xAI and Tesla News", "https://www.tesla.com/blog", "press_release", "ai_infrastructure", "AI compute, facilities, and power demand."],
  ["Equinix Newsroom", "https://www.equinix.com/newsroom", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["Digital Realty Newsroom", "https://www.digitalrealty.com/newsroom", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["QTS Newsroom", "https://qtsdatacenters.com/company/newsroom/", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["CyrusOne Newsroom", "https://cyrusone.com/newsroom/", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["Switch Newsroom", "https://www.switch.com/news/", "press_release", "data_center_operator", "Operator construction and expansion announcements."],
  ["Aligned Newsroom", "https://aligneddc.com/newsroom/", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["Compass Datacenters Newsroom", "https://www.compassdatacenters.com/newsroom/", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["EdgeCore Newsroom", "https://www.edgecore.com/newsroom", "data_center_operator", "data_center_operator", "Data center operator news."],
  ["Vantage Data Centers Newsroom", "https://vantage-dc.com/news/", "press_release", "data_center_operator", "Operator construction and expansion announcements."],
  ["NTT Global Data Centers News", "https://services.global.ntt/en/services/global-data-centers/news", "data_center_operator", "data_center_operator", "Data center operator news."]
].map(([name, url, type, category, notes], index) => source({ name, url, type, category, tier: 1, notes, enabled: index < 2 }));

const tier2 = [
  ["Data Center Dynamics", "https://www.datacenterdynamics.com/en/news/", "media", "data_center_media", "low"],
  ["Data Center Dynamics Power Topic", "https://www.datacenterdynamics.com/en/search/?query=power", "media", "data_center_media", "low"],
  ["Data Center Frontier", "https://www.datacenterfrontier.com/", "media", "data_center_media", "low"],
  ["Data Center Frontier Energy", "https://www.datacenterfrontier.com/energy/", "media", "data_center_media", "low"],
  ["Data Center Knowledge", "https://www.datacenterknowledge.com/", "media", "data_center_media", "medium"],
  ["Data Center Knowledge Energy & Power Supply", "https://www.datacenterknowledge.com/build-design/energy-power-supply", "media", "data_center_media", "medium"],
  ["Bisnow Data Centers", "https://www.bisnow.com/data-center", "media", "real_estate_data_centers", "medium"],
  ["DatacenterHawk", "https://datacenterhawk.com/blog", "media", "data_center_market", "medium"],
  ["Uptime Institute", "https://journal.uptimeinstitute.com/", "research", "data_center_research", "medium"],
  ["iMasons", "https://imasons.org/news/", "media", "digital_infrastructure", "low"],
  ["Structure Research", "https://structureresearch.net/", "research", "data_center_research", "high"],
  ["Cloudscene", "https://cloudscene.com/", "media", "data_center_market", "medium"],
  ["Utility Dive", "https://www.utilitydive.com/", "media", "energy_media", "low"],
  ["Utility Dive Transmission & Distribution", "https://www.utilitydive.com/topic/transmission-distribution/", "media", "energy_media", "low"],
  ["Utility Dive Generation", "https://www.utilitydive.com/topic/generation/", "media", "energy_media", "low"],
  ["Power Engineering", "https://www.power-eng.com/", "media", "energy_media", "low"],
  ["T&D World", "https://www.tdworld.com/", "media", "transmission_distribution", "low"],
  ["T&D World Grid Innovations", "https://www.tdworld.com/grid-innovations", "media", "transmission_distribution", "low"],
  ["POWER Magazine", "https://www.powermag.com/", "media", "power_generation", "low"],
  ["POWER Magazine Data Centers", "https://www.powermag.com/category/data-centers/", "media", "power_generation", "low"],
  ["RTO Insider", "https://www.rtoinsider.com/", "media", "energy_markets", "high"],
  ["Canary Media", "https://www.canarymedia.com/", "media", "clean_energy_media", "low"],
  ["Canary Media Grid Edge", "https://www.canarymedia.com/topics/grid-edge", "media", "clean_energy_media", "low"],
  ["Energy Storage News", "https://www.energy-storage.news/", "media", "storage_media", "low"],
  ["Renewable Energy World", "https://www.renewableenergyworld.com/", "media", "renewable_energy_media", "low"],
  ["PV Magazine USA", "https://pv-magazine-usa.com/", "media", "solar_storage_media", "low"],
  ["Solar Power World", "https://www.solarpowerworldonline.com/", "media", "solar_media", "low"],
  ["Utility Products", "https://www.utilityproducts.com/", "media", "utility_equipment", "low"],
  ["IEEE Spectrum Energy", "https://spectrum.ieee.org/energy", "media", "technical_energy_media", "medium"],
  ["EPRI News", "https://www.epri.com/about/news", "research", "utility_research", "medium"],
  ["IEA Energy and AI", "https://www.iea.org/reports/energy-and-ai", "research", "global_energy_research", "low"],
  ["RMI", "https://rmi.org/insight/", "research", "energy_policy_research", "low"],
  ["RMI Electricity", "https://rmi.org/our-work/electricity/", "research", "energy_policy_research", "low"],
  ["Columbia Center on Global Energy Policy", "https://www.energypolicy.columbia.edu/insights/", "research", "energy_policy_research", "low"],
  ["Columbia CGEP", "https://www.energypolicy.columbia.edu/", "research", "energy_policy_research", "low"],
  ["MIT Energy Initiative", "https://energy.mit.edu/news/", "research", "energy_research", "low"],
  ["Harvard Belfer Center Energy", "https://www.belfercenter.org/research-analysis/energy", "research", "energy_policy_research", "low"],
  ["Harvard Belfer Energy", "https://www.belfercenter.org/research/topic/energy", "research", "energy_policy_research", "low"],
  ["Brookings Energy and Infrastructure", "https://www.brookings.edu/topics/energy/", "research", "policy_research", "low"],
  ["Brookings Energy", "https://www.brookings.edu/topics/energy/", "research", "policy_research", "low"],
  ["Resources for the Future", "https://www.rff.org/publications/", "research", "energy_economics_research", "low"],
  ["Resources for the Future News", "https://www.rff.org/news-and-media/", "research", "energy_economics_research", "low"],
  ["arXiv AI Electricity Search", "https://arxiv.org/search/?query=AI+data+center+electricity+grid&searchtype=all", "research", "academic_research", "low"]
].map(([name, url, type, category, paywall]) => source({ name, url, type, category, tier: 2, paywall, notes: "Discovery source; verify material claims with Tier 1 where possible." }));

const tier3 = [
  ["Reuters Energy", "https://www.reuters.com/business/energy/", "media", "general_news_energy", "medium"],
  ["Bloomberg Energy and Technology", "https://www.bloomberg.com/energy", "media", "general_business_news", "high"],
  ["Wall Street Journal", "https://www.wsj.com/news/business/energy-oil-gas", "media", "general_business_news", "high"],
  ["CNBC", "https://www.cnbc.com/energy/", "media", "general_business_news", "medium"],
  ["AP News", "https://apnews.com/hub/energy", "media", "general_news", "low"],
  ["Axios", "https://www.axios.com/technology/artificial-intelligence", "media", "general_news", "medium"],
  ["The Verge", "https://www.theverge.com/ai-artificial-intelligence", "media", "tech_media", "low"],
  ["TechCrunch", "https://techcrunch.com/category/artificial-intelligence/", "media", "tech_media", "medium"],
  ["PR Newswire", "https://www.prnewswire.com/news-releases/", "press_release", "press_release_wire", "low"],
  ["Business Wire", "https://www.businesswire.com/portal/site/home/news/", "press_release", "press_release_wire", "low"],
  ["GlobeNewswire", "https://www.globenewswire.com/", "press_release", "press_release_wire", "low"],
  ["Accesswire", "https://www.accesswire.com/newsroom", "press_release", "press_release_wire", "low"]
].map(([name, url, type, category, paywall]) => source({ name, url, type, category, tier: 3, paywall, notes: "Discovery only. Major claims require Tier 1 verification before approval." }));

const localGovernments = [
  ["Loudoun County planning", "VA"], ["Prince William County planning", "VA"],
  ["Fairfax County planning and zoning", "VA"], ["Henrico County planning", "VA"],
  ["Fulton County planning", "GA"], ["Douglas County planning", "GA"],
  ["Dallas-Fort Worth planning", "TX"], ["Phoenix-Mesa-Goodyear planning", "AZ"],
  ["Columbus planning", "OH"], ["Chicago-area planning", "IL"],
  ["Des Moines planning", "IA"]
].map(([name, state]) => source({
  name,
  url: "",
  type: "local_government",
  category: "local_planning",
  tier: 1,
  method: "manual",
  notes: `${state} placeholder. Add an exact agenda, planning, or economic-development URL before enabling.`
}));

export const sourceRegistry = [...tier1, ...tier2, ...tier3, ...localGovernments];

export const relevanceKeywords = [
  "data center", "datacenter", "AI infrastructure", "AI data center", "hyperscale", "cloud region",
  "electricity demand", "power demand", "load growth", "grid capacity", "transmission", "interconnection",
  "substation", "utility", "nuclear", "natural gas", "solar", "wind", "battery storage", "renewable energy",
  "PJM", "ERCOT", "CAISO", "MISO", "SPP", "NYISO", "ISO-NE", "FERC", "DOE", "EIA",
  "Dominion Energy", "Duke Energy", "Southern Company", "Entergy", "NextEra", "Constellation", "Vistra",
  "GE Vernova", "transformer", "power plant", "permitting", "zoning", "planning commission",
  "power purchase agreement", "PPA"
];

export const contentPipelineDefaults = {
  CONTENT_PIPELINE_ENABLED: true,
  AUTO_PUBLISH: false,
  MIN_RELEVANCE_SCORE: 70,
  MAX_ARTICLES_PER_RUN: 10
};
