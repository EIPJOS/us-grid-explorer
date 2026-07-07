/**
 * publish-daily-articles.mjs
 *
 * Fully automated daily research publisher for usgridexplorer.com.
 *
 * Flow:
 *   1. Scan RSS/API sources (curated feed list below + enabled registry sources).
 *   2. Score and deduplicate items with the existing content pipeline.
 *   3. Skip anything already published (checked against Supabase).
 *   4. Select the top N candidates (Tier 1 first, then 2, then 3).
 *   5. Fetch each article page for extra context (best effort).
 *   6. Ask Claude to write an original summary + "why it matters" analysis.
 *   7. Insert the finished articles into Supabase (table: watch_articles).
 *
 * Required environment variables:
 *   ANTHROPIC_API_KEY          Anthropic API key
 *   SUPABASE_URL               e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  Supabase service-role key (server-side only!)
 *
 * Optional:
 *   ARTICLE_MODEL              default "claude-sonnet-4-6"
 *   ARTICLE_LIMIT              default 3
 *   ARTICLE_MIN_SCORE          default 55
 */

import { sourceRegistry, contentPipelineDefaults } from "../src/data/sourceRegistry.js";
import { fetchSource, scoreItem, deduplicateItems, groupAndVerify } from "../server/content-pipeline.mjs";

const ANTHROPIC_API_KEY = requireEnv("ANTHROPIC_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const MODEL = process.env.ARTICLE_MODEL || "claude-sonnet-4-6";
const LIMIT = Number(process.env.ARTICLE_LIMIT || 3);
const MIN_SCORE = Number(process.env.ARTICLE_MIN_SCORE || 55);

/**
 * Curated always-on RSS/Atom feeds. These give the pipeline real article-level
 * items every day (the registry's default "webpage_metadata" method only yields
 * one item per page). Any feed that fails is logged and skipped gracefully, so
 * a wrong or changed URL never breaks the run.
 */
const rssSources = [
  rss("EIA Today in Energy (RSS)", "https://www.eia.gov/rss/todayinenergy.xml", "government", "government_energy", 1),
  rss("Utility Dive (RSS)", "https://www.utilitydive.com/feeds/news/", "media", "energy_media", 2),
  rss("Data Center Knowledge (RSS)", "https://www.datacenterknowledge.com/rss.xml", "media", "data_center_media", 2),
  rss("Data Center Dynamics (RSS)", "https://www.datacenterdynamics.com/rss/", "media", "data_center_media", 2),
  rss("Data Center Frontier (RSS)", "https://www.datacenterfrontier.com/rss.xml", "media", "data_center_media", 2),
  rss("POWER Magazine (RSS)", "https://www.powermag.com/feed/", "media", "power_generation", 2),
  rss("PV Magazine USA (RSS)", "https://pv-magazine-usa.com/feed/", "media", "solar_storage_media", 2),
  rss("Renewable Energy World (RSS)", "https://www.renewableenergyworld.com/feed/", "media", "renewable_energy_media", 2),
  rss("Canary Media (RSS)", "https://www.canarymedia.com/rss.xml", "media", "clean_energy_media", 2),
  rss("T&D World (RSS)", "https://www.tdworld.com/rss.xml", "media", "transmission_distribution", 2),
  rss(
    "arXiv: data centers & electricity (Atom)",
    "https://export.arxiv.org/api/query?search_query=all:%22data%20center%22%20AND%20all:electricity&sortBy=submittedDate&sortOrder=descending&max_results=15",
    "research",
    "academic_research",
    2
  )
];

function rss(name, url, type, category, tier) {
  return {
    id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    source_name: name,
    source_url: url,
    source_type: type,
    category,
    tier,
    reliability_score: tier === 1 ? 92 : 78,
    fetch_method: "rss",
    allowed_to_fetch_full_text: false,
    paywall_risk: "low",
    notes: "Curated always-on feed for the daily article automation.",
    enabled: true
  };
}

async function main() {
  const now = new Date();
  console.log(`[publish] Run started ${now.toISOString()} | model=${MODEL} limit=${LIMIT}`);

  // ---- 1. Scan sources -----------------------------------------------------
  const registryEnabled = sourceRegistry.filter((source) => source.enabled);
  const rssIds = new Set(rssSources.map((source) => source.id));
  const sources = [...rssSources, ...registryEnabled.filter((source) => !rssIds.has(source.id))];

  const fetched = [];
  const errors = [];
  for (const source of sources) {
    try {
      const items = await fetchSource(source, {});
      fetched.push(...items.map((item) => scoreItem(item, source)));
      console.log(`[scan] ${source.source_name}: ${items.length} item(s)`);
    } catch (error) {
      errors.push({ source: source.source_name, message: error instanceof Error ? error.message : String(error) });
      console.warn(`[scan] ${source.source_name} failed: ${error?.message ?? error}`);
    }
  }

  const relevant = deduplicateItems(fetched).filter((item) => item.relevance_score >= MIN_SCORE);
  const reviewed = groupAndVerify(relevant);
  console.log(`[scan] ${fetched.length} fetched -> ${reviewed.length} relevant (min score ${MIN_SCORE})`);

  // ---- 2. Drop anything already published ----------------------------------
  const publishedUrls = await fetchPublishedUrls();
  const fresh = reviewed.filter((item) => item.url && !publishedUrls.has(item.url));
  console.log(`[dedup] ${reviewed.length - fresh.length} already published, ${fresh.length} fresh candidates`);

  // ---- 3. Select top candidates (Tier 1 -> 2 -> 3) -------------------------
  const selected = selectCandidates(fresh, LIMIT);
  if (!selected.length) {
    console.log("[select] No new qualifying items today. Exiting cleanly.");
    return;
  }
  console.log(`[select] ${selected.length} item(s):`);
  for (const item of selected) console.log(`  - [T${item.source_tier} s${item.relevance_score}] ${item.title}`);

  // ---- 4 & 5. Enrich + summarize with Claude --------------------------------
  const articles = [];
  for (const item of selected) {
    try {
      const pageText = await fetchArticleContext(item.url);
      const editorial = await summarizeWithClaude(item, pageText);
      articles.push(toArticleRow(item, editorial, now));
      console.log(`[claude] Summarized: ${item.title}`);
    } catch (error) {
      console.warn(`[claude] Failed on "${item.title}": ${error?.message ?? error}`);
    }
  }

  if (!articles.length) {
    console.error("[publish] All summarizations failed; nothing to insert.");
    process.exitCode = 1;
    return;
  }

  // ---- 6. Insert into Supabase ----------------------------------------------
  const inserted = await insertArticles(articles);
  console.log(`[publish] Done. Inserted ${inserted} article(s) into Supabase.`);
  if (errors.length) console.log(`[publish] ${errors.length} source(s) failed this run (non-fatal).`);
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function selectCandidates(items, limit) {
  const selected = [];
  const usedUrls = new Set();
  const usedGroups = new Set();
  for (const tier of [1, 2, 3]) {
    const tierItems = items
      .filter((item) => item.source_tier === tier)
      .sort((a, b) => {
        const verified = Number((b.verification_status === "verified") - (a.verification_status === "verified"));
        if (verified) return verified;
        const relevance = (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
        if (relevance) return relevance;
        return new Date(b.published_at ?? b.discovered_at ?? 0) - new Date(a.published_at ?? a.discovered_at ?? 0);
      });
    for (const item of tierItems) {
      if (selected.length >= limit) return selected;
      if (usedUrls.has(item.url)) continue;
      if (item.group_id && usedGroups.has(item.group_id)) continue; // one story per topic cluster
      selected.push(item);
      usedUrls.add(item.url);
      if (item.group_id) usedGroups.add(item.group_id);
    }
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Article-page enrichment (best effort)
// ---------------------------------------------------------------------------

async function fetchArticleContext(url) {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "USGridExplorerResearchBot/1.0 (+https://usgridexplorer.com/sources/)" },
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return "";
    const html = await response.text();
    const description = html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((text) => text.length > 60);
    return `${description}\n\n${paragraphs.join("\n")}`.slice(0, 3500);
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Claude summarization
// ---------------------------------------------------------------------------

async function summarizeWithClaude(item, pageText) {
  const prompt = [
    "You are the research editor for US Grid Explorer (usgridexplorer.com), a site covering U.S. power-grid and data-center infrastructure.",
    "Write an original research briefing card for the item below.",
    "",
    "Rules:",
    "- Write everything IN YOUR OWN WORDS. Never copy sentences or distinctive phrases from the source; this is a paraphrased editorial summary with attribution, not a reproduction.",
    "- Use ONLY facts present in the material below. Never invent numbers, quotes, locations, or company names.",
    "- Audience: grid planners, data-center developers, energy analysts, and investors.",
    '- "summary": 2-4 sentences describing what the source reports or finds.',
    '- "whyItMatters": 2-3 sentences on the practical implication for U.S. grid planning, electricity demand, siting, or data-center development.',
    '- "tags": 3-6 short lowercase snake_case topic tags (e.g. "ai_data_center", "transmission", "load_growth").',
    '- "importanceScore": integer 50-98 for how significant this is to the data-center/grid audience.',
    "- If the material is too thin to say something meaningful, still produce a cautious, accurate card based on the title and source type.",
    "",
    "Respond with ONLY a JSON object: {\"summary\": string, \"whyItMatters\": string, \"tags\": string[], \"importanceScore\": number}. No markdown, no backticks, no preamble.",
    "",
    `SOURCE NAME: ${item.source_name} (Tier ${item.source_tier})`,
    `TITLE: ${item.title}`,
    `PUBLISHED: ${item.published_at ?? "unknown"}`,
    `FEED SNIPPET: ${item.snippet || "(none)"}`,
    `PAGE EXCERPT (may be empty or noisy):\n${pageText || "(unavailable)"}`
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();

  const parsed = JSON.parse(text);
  if (!parsed.summary || !parsed.whyItMatters) throw new Error("Claude response missing required fields.");
  return {
    summary: String(parsed.summary).trim(),
    whyItMatters: String(parsed.whyItMatters).trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map(normalizeTag).filter(Boolean) : [],
    importanceScore: clamp(Number(parsed.importanceScore) || 70, 50, 98)
  };
}

// ---------------------------------------------------------------------------
// Supabase (PostgREST, no client library needed)
// ---------------------------------------------------------------------------

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function fetchPublishedUrls() {
  const url = `${SUPABASE_URL}/rest/v1/watch_articles?select=url&order=created_at.desc&limit=1000`;
  const response = await fetch(url, { headers: supabaseHeaders(), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Supabase read failed: HTTP ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return new Set(rows.map((row) => row.url).filter(Boolean));
}

async function insertArticles(articles) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/watch_articles?on_conflict=url`, {
    method: "POST",
    headers: supabaseHeaders({ Prefer: "resolution=ignore-duplicates,return=representation" }),
    body: JSON.stringify(articles),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Supabase insert failed: HTTP ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return rows.length;
}

function toArticleRow(item, editorial, now) {
  const tags = unique([
    ...editorial.tags,
    ...(item.matched_keywords ?? []).slice(0, 3).map(normalizeTag),
    item.source_tier === 1 ? "primary_source" : "industry_source"
  ]).slice(0, 6);

  return {
    id: item.id,
    title: item.title,
    source_name: item.source_name,
    source_type: item.source_type,
    source_tier: item.source_tier,
    url: item.url,
    published_date: (item.published_at ?? now.toISOString()).slice(0, 10),
    summary: editorial.summary,
    why_it_matters: editorial.whyItMatters,
    tags,
    corroborating_sources: buildCorroboratingSources(item),
    importance_score: editorial.importanceScore,
    model: MODEL,
    status: "published",
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };
}

function buildCorroboratingSources(item) {
  const sources = [];
  const seen = new Set();
  for (const sourceId of item.verification_sources ?? []) {
    const entry = sourceRegistry.find((source) => source.id === sourceId) ?? rssSources.find((source) => source.id === sourceId);
    if (!entry?.source_url || seen.has(entry.source_url)) continue;
    seen.add(entry.source_url);
    sources.push({ label: entry.source_name, url: entry.source_url });
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function normalizeTag(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

await main();
