const FEDERAL_REGISTER_QUERIES = [
  "data center electricity",
  "data center transmission",
  "large load interconnection",
  "electric reliability data center",
  "transmission planning large load",
  "electricity demand data center"
];

const STATE_PATTERNS = [
  ["VA", /\bvirginia\b|\bloudoun\b|\bprince william\b|\bashburn\b/i],
  ["TX", /\btexas\b|\bercot\b|\bdallas\b|\bfort worth\b|\bsan antonio\b|\baustin\b/i],
  ["CA", /\bcalifornia\b|\bcaiso\b|\blos angeles\b|\bsilicon valley\b|\bsan jose\b/i],
  ["AZ", /\barizona\b|\bphoenix\b|\bmaricopa\b/i],
  ["OH", /\bohio\b|\bcolumbus\b/i],
  ["GA", /\bgeorgia\b|\batlanta\b/i],
  ["PA", /\bpennsylvania\b|\bpjm\b/i],
  ["IL", /\billinois\b|\bchicago\b/i],
  ["NY", /\bnew york\b|\bnyiso\b/i],
  ["NJ", /\bnew jersey\b|\bpjm\b/i]
];

const ISO_PATTERNS = [
  ["PJM", /\bpjm\b|mid-atlantic|virginia|pennsylvania|new jersey|ohio/i],
  ["ERCOT", /\bercot\b|texas/i],
  ["CAISO", /\bcaiso\b|california/i],
  ["MISO", /\bmiso\b|midcontinent/i],
  ["NYISO", /\bnyiso\b|new york/i],
  ["ISO-NE", /\biso-ne\b|new england/i],
  ["SPP", /\bspp\b|southwest power pool/i]
];

const TAG_RULES = [
  ["data_center_project", /\bdata centers?\b|\bhyperscale\b|\bai infrastructure\b/i],
  ["large_load_interconnection", /\blarge loads?\b|\binterconnection\b|\bnew loads?\b/i],
  ["transmission_upgrade", /\btransmission\b|\bgrid upgrade\b|\bnetwork upgrade\b/i],
  ["electricity_price", /\brate\b|\btariff\b|\bprice\b|\bcost allocation\b/i],
  ["zoning", /\bzoning\b|\bland use\b|\bcounty\b|\bpermit\b/i],
  ["air_permit", /\bair permit\b|\bemissions\b|\bnox\b|\bbackup generators?\b/i],
  ["water_use", /\bwater\b|\bcooling\b/i],
  ["utility_rate_case", /\brate case\b|\butility commission\b|\bpublic service commission\b/i],
  ["ferc_order", /\bferc\b|\bfederal energy regulatory commission\b|\border\b/i],
  ["state_policy", /\bpolicy\b|\brule\b|\bnotice\b|\bproposed rule\b|\bfinal rule\b/i],
  ["nuclear_power", /\bnuclear\b|\breactor\b|\bsmall modular\b|\bsmr\b/i],
  ["natural_gas", /\bnatural gas\b|\bgas-fired\b|\bpipeline\b/i],
  ["renewables", /\brenewable\b|\bsolar\b|\bwind\b/i],
  ["battery_storage", /\bbattery\b|\bstorage\b/i]
];

export async function fetchFederalRegisterWatchItems({ fetchImpl = fetch, limit = 18 } = {}) {
  const fetchedAt = new Date().toISOString();
  const results = [];

  for (const query of FEDERAL_REGISTER_QUERIES) {
    const url = new URL("https://www.federalregister.gov/api/v1/documents.json");
    url.searchParams.set("conditions[term]", query);
    url.searchParams.set("per_page", "12");
    url.searchParams.set("order", "newest");
    url.searchParams.set("fields[]", "title");
    url.searchParams.append("fields[]", "type");
    url.searchParams.append("fields[]", "abstract");
    url.searchParams.append("fields[]", "document_number");
    url.searchParams.append("fields[]", "html_url");
    url.searchParams.append("fields[]", "publication_date");
    url.searchParams.append("fields[]", "agencies");

    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Federal Register returned ${response.status}`);
    const payload = await response.json();
    results.push(...(payload.results ?? []));
  }

  const deduped = [...new Map(results.map((document) => [document.document_number || document.html_url, document])).values()];
  return deduped
    .map((document) => normalizeFederalRegisterDocument(document, fetchedAt))
    .filter((item) => item.importanceScore >= 50)
    .sort((a, b) => b.importanceScore - a.importanceScore || new Date(b.publishedDate ?? 0) - new Date(a.publishedDate ?? 0))
    .slice(0, limit);
}

export function normalizeFederalRegisterDocument(document, fetchedAt = new Date().toISOString()) {
  const text = [document.title, document.type, document.abstract, ...(document.agencies ?? []).map((agency) => agency.name)].filter(Boolean).join(" ");
  const tags = TAG_RULES.filter(([, pattern]) => pattern.test(text)).map(([tag]) => tag);
  const agency = document.agencies?.[0]?.name;
  const state = STATE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
  const isoRto = ISO_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
  const hasEnergyAgency = /energy|ferc|environmental protection|interior|commerce|transportation/i.test(text);
  const sourceType = /proposed rule|rule|notice/i.test(document.type ?? "") ? "regulation" : "government";
  const importanceScore = scoreFederalRegisterItem({ text, tags, type: document.type, hasEnergyAgency });

  return {
    id: `federal-register-${slugify(document.document_number || document.title)}`,
    title: document.title,
    sourceName: "Federal Register",
    sourceType,
    url: document.html_url,
    publishedDate: document.publication_date,
    state,
    agency,
    isoRto,
    tags: tags.length ? tags : ["state_policy"],
    summary: summarizeFederalRegisterDocument(document, tags),
    importanceScore,
    createdAt: fetchedAt,
    updatedAt: fetchedAt
  };
}

function summarizeFederalRegisterDocument(document, tags) {
  const agency = document.agencies?.[0]?.name;
  const nature = describeNature(tags, document.type);
  const abstract = cleanText(document.abstract);
  const sourceMessage = abstract || cleanText(document.title);
  const clipped = sourceMessage.length > 220 ? `${sourceMessage.slice(0, 217).trim()}...` : sourceMessage;
  return `${agency ? `${agency} published` : "A federal agency published"} a ${String(document.type || "notice").toLowerCase()} related to ${nature}. ${clipped}`;
}

function describeNature(tags, type) {
  if (tags.includes("large_load_interconnection")) return "large-load interconnection and grid planning";
  if (tags.includes("transmission_upgrade")) return "transmission planning or grid infrastructure";
  if (tags.includes("data_center_project")) return "data center demand and infrastructure";
  if (tags.includes("electricity_price")) return "electricity cost or rate impacts";
  if (tags.includes("air_permit")) return "air permitting and backup generation";
  if (tags.includes("water_use")) return "water use or cooling constraints";
  if (/rule/i.test(type ?? "")) return "federal rulemaking";
  return "electric reliability and public infrastructure policy";
}

function scoreFederalRegisterItem({ text, tags, type, hasEnergyAgency }) {
  let score = 25;
  if (hasEnergyAgency) score += 8;
  if (/data centers?/i.test(text)) score += 30;
  if (/large loads?|interconnection/i.test(text)) score += 25;
  if (/transmission|reliability|electricity demand|power grid|regional transmission organization|independent system operator/i.test(text)) score += 16;
  if (/ferc|federal energy regulatory commission/i.test(text)) score += 7;
  if (/proposed rule|final rule|notice/i.test(type ?? "")) score += 5;
  score += Math.min(tags.length * 4, 16);
  return Math.min(score, 98);
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
