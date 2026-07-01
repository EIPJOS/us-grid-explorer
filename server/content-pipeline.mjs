import { XMLParser } from "fast-xml-parser";
import { relevanceKeywords } from "../src/data/sourceRegistry.js";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true });

export async function fetchSource(source, { fetchImpl = fetch } = {}) {
  if (!source.enabled || !source.source_url || source.fetch_method === "manual") return [];
  const response = await fetchWithTimeout(source.source_url, fetchImpl);
  if (!response.ok) throw new Error(`${source.source_name}: HTTP ${response.status}`);
  const body = await response.text();

  if (source.fetch_method === "rss") return parseFeed(body, source);
  if (source.fetch_method === "api") return parseJsonApi(body, source);
  return [parsePageMetadata(body, source)];
}

export function parseFeed(xml, source) {
  const document = parser.parse(xml);
  const rssItems = arrayOf(document?.rss?.channel?.item);
  const atomItems = arrayOf(document?.feed?.entry);
  return [...rssItems, ...atomItems].map((item) => normalizeItem({
    title: textOf(item.title),
    url: linkOf(item.link) || textOf(item.guid),
    published_at: textOf(item.pubDate) || textOf(item.published) || textOf(item.updated),
    description: stripMarkup(textOf(item.description) || textOf(item.summary) || textOf(item.content))
  }, source)).filter((item) => item.title && item.url);
}

export function parsePageMetadata(html, source) {
  const metadata = extractMeta(html);
  return normalizeItem({
    title: metadata["og:title"] || metadata["twitter:title"] || extractTitle(html) || source.source_name,
    url: metadata["og:url"] || source.source_url,
    published_at: metadata["article:published_time"] || null,
    description: metadata["og:description"] || metadata.description || ""
  }, source);
}

function parseJsonApi(body, source) {
  const payload = JSON.parse(body);
  const rows = Array.isArray(payload) ? payload : payload.items ?? payload.results ?? [];
  return rows.map((item) => normalizeItem({
    title: item.title || item.name,
    url: item.url || item.html_url || item.link,
    published_at: item.published_at || item.publication_date || item.date,
    description: item.description || item.summary || item.abstract || ""
  }, source)).filter((item) => item.title && item.url);
}

function normalizeItem(item, source) {
  const canonicalUrl = canonicalizeUrl(item.url, source.source_url);
  return {
    id: stableId(`${source.id}:${canonicalUrl || item.title}`),
    source_id: source.id,
    source_name: source.source_name,
    source_tier: source.tier,
    source_type: source.source_type,
    category: source.category,
    title: cleanText(item.title),
    url: canonicalUrl,
    published_at: normalizeDate(item.published_at),
    discovered_at: new Date().toISOString(),
    snippet: cleanText(item.description).slice(0, 600),
    relevance_score: 0,
    matched_keywords: [],
    group_id: null,
    verification_status: source.tier === 1 ? "primary" : "needs_review",
    verification_sources: source.tier === 1 ? [source.id] : [],
    review_status: "pending"
  };
}

export function scoreItem(item, source) {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  const matched = relevanceKeywords.filter((keyword) => text.includes(keyword.toLowerCase()));
  const titleMatches = matched.filter((keyword) => item.title.toLowerCase().includes(keyword.toLowerCase())).length;
  const phraseScore = Math.min(55, matched.length * 7 + titleMatches * 5);
  const tierScore = source.tier === 1 ? 25 : source.tier === 2 ? 16 : 9;
  const focusBonus = /data\s?center|hyperscale|ai infrastructure/i.test(text) ? 20 : 0;
  return { ...item, matched_keywords: matched, relevance_score: Math.min(100, phraseScore + tierScore + focusBonus) };
}

export function deduplicateItems(items) {
  const kept = [];
  for (const item of items.sort((a, b) => b.relevance_score - a.relevance_score)) {
    const duplicate = kept.some((existing) => existing.url === item.url || (
      existing.source_id === item.source_id && titleSimilarity(existing.title, item.title) >= 0.82
    ));
    if (!duplicate) kept.push(item);
  }
  return kept;
}

export function groupAndVerify(items) {
  const grouped = items.map((item) => ({ ...item, group_id: groupKey(item) }));
  const tier1ByGroup = new Map();
  for (const item of grouped.filter((candidate) => candidate.source_tier === 1)) {
    const bucket = tier1ByGroup.get(item.group_id) ?? [];
    bucket.push(item.source_id);
    tier1ByGroup.set(item.group_id, bucket);
  }
  return grouped.map((item) => {
    if (item.source_tier === 1) return item;
    const sources = tier1ByGroup.get(item.group_id) ?? [];
    return {
      ...item,
      verification_status: sources.length ? "verified" : "needs_review",
      verification_sources: sources
    };
  });
}

export function mergeQueue(existing, discovered) {
  const existingByUrl = new Map(existing.map((item) => [item.url, item]));
  return deduplicateItems(discovered.map((item) => {
    const prior = existingByUrl.get(item.url);
    return prior ? { ...item, review_status: prior.review_status, draft: prior.draft } : item;
  }).concat(existing.filter((item) => !discovered.some((next) => next.url === item.url))));
}

export async function runMonitor({ sources, existing = [], minScore = 70, maxItems = 10, fetchImpl = fetch }) {
  const errors = [];
  const fetched = [];
  for (const source of sources.filter((candidate) => candidate.enabled)) {
    try {
      const items = await fetchSource(source, { fetchImpl });
      fetched.push(...items.map((item) => scoreItem(item, source)));
    } catch (error) {
      errors.push({ source_id: source.id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const relevant = deduplicateItems(fetched).filter((item) => item.relevance_score >= minScore);
  const reviewed = groupAndVerify(relevant).slice(0, maxItems);
  return { items: mergeQueue(existing, reviewed), errors, fetched_count: fetched.length, relevant_count: reviewed.length };
}

function fetchWithTimeout(url, fetchImpl) {
  return fetchImpl(url, {
    headers: { "User-Agent": "USGridExplorerSourceMonitor/1.0 (+https://usgridexplorer.com/sources/)" },
    signal: AbortSignal.timeout(15000)
  });
}

function extractMeta(html) {
  const result = {};
  for (const tag of html.match(/<meta\s+[^>]*>/gi) ?? []) {
    const key = attribute(tag, "property") || attribute(tag, "name");
    const value = attribute(tag, "content");
    if (key && value) result[key.toLowerCase()] = value;
  }
  return result;
}

function attribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function extractTitle(html) {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value["#text"] ?? value.__cdata ?? "";
}

function linkOf(value) {
  if (Array.isArray(value)) value = value.find((link) => link?.["@_rel"] === "alternate") ?? value[0];
  return typeof value === "string" ? value : value?.["@_href"] ?? "";
}

function arrayOf(value) { return value == null ? [] : Array.isArray(value) ? value : [value]; }
function stripMarkup(value) { return String(value ?? "").replace(/<[^>]+>/g, " "); }
function cleanText(value) { return decodeEntities(String(value ?? "")).replace(/\s+/g, " ").trim(); }
function decodeEntities(value) { return value.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
function normalizeDate(value) { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.valueOf()) ? date.toISOString() : null; }
function canonicalizeUrl(value, base) { try { const url = new URL(value, base); for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key); url.hash = ""; return url.href; } catch { return ""; } }
function stableId(value) { let hash = 2166136261; for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `feed-${(hash >>> 0).toString(16)}`; }
function words(value) { return new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2)); }
function titleSimilarity(a, b) { const left = words(a); const right = words(b); const intersection = [...left].filter((word) => right.has(word)).length; const union = new Set([...left, ...right]).size; return union ? intersection / union : 0; }
function groupKey(item) { const tokens = [...words(`${item.title} ${item.matched_keywords.join(" ")}`)].filter((word) => !["data", "center", "energy", "power", "grid", "news"].includes(word)).sort().slice(0, 5); return tokens.length ? tokens.join("-") : item.id; }
