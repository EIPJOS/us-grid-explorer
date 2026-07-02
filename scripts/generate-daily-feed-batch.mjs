import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { sourceRegistry, contentPipelineDefaults } from "../src/data/sourceRegistry.js";
import { fetchSource, scoreItem, deduplicateItems, groupAndVerify, mergeQueue } from "../server/content-pipeline.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const feedDataDir = path.join(repoRoot, "src/data/generated");
const studioDataDir = path.join(repoRoot, "tools/feed-studio/data");
const batchFile = path.join(feedDataDir, "daily-feed-batch.json");
const studioBatchFile = path.join(studioDataDir, "daily-feed-batch.json");
const queueFile = path.join(studioDataDir, "feed-review-queue.json");
const stateFile = path.join(studioDataDir, "feed-batch-state.json");

export async function runDailyFeedBatch({
  fetchImpl = fetch,
  now = new Date(),
  limit = 3,
  minScore = contentPipelineDefaults.MIN_RELEVANCE_SCORE
} = {}) {
  const [existingQueue, priorBatchState, priorBatch] = await Promise.all([
    readJson(queueFile, []),
    readJson(stateFile, { consumedIds: [], lastRunAt: null }),
    readJson(batchFile, null)
  ]);

  const scan = await scanSources({
    sources: sourceRegistry,
    fetchImpl,
    minScore
  });

  const reviewed = groupAndVerify(scan.items);
  const queued = mergeQueue(existingQueue, reviewed.slice(0, contentPipelineDefaults.MAX_ARTICLES_PER_RUN));
  const selected = selectDailyItems(reviewed, priorBatchState.consumedIds ?? [], limit);
  const batch = selected.length
    ? {
        generatedAt: now.toISOString(),
        timezone: "America/New_York",
        model: process.env.FEED_GENERATION_MODEL || "gpt-5.4-mini-medium",
        limit,
        sourceCount: scan.fetched_count,
        itemCount: selected.length,
        items: selected.map((item) => toBriefingArticle(item, now))
      }
    : priorBatch ?? {
        generatedAt: now.toISOString(),
        timezone: "America/New_York",
        model: process.env.FEED_GENERATION_MODEL || "gpt-5.4-mini-medium",
        limit,
        sourceCount: scan.fetched_count,
        itemCount: 0,
        items: []
      };

  const nextConsumedIds = unique([
    ...(priorBatchState.consumedIds ?? []),
    ...selected.map((item) => item.id)
  ]);

  await Promise.all([
    writeJson(queueFile, queued),
    writeJson(batchFile, batch),
    writeJson(studioBatchFile, batch),
    writeJson(stateFile, {
      consumedIds: nextConsumedIds.slice(-250),
      lastRunAt: now.toISOString(),
      lastSelectionCount: selected.length,
      lastSourceCount: scan.fetched_count
    })
  ]);

  return {
    fetchedCount: scan.fetched_count,
    relevantCount: reviewed.length,
    selectedCount: selected.length,
    batch,
    errors: scan.errors
  };
}

async function scanSources({ sources, fetchImpl, minScore }) {
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
  return { items: relevant, errors, fetched_count: fetched.length };
}

function selectDailyItems(items, consumedIds, limit) {
  const consumed = new Set(consumedIds);
  const selected = [];
  const used = new Set();
  for (const tier of [1, 2, 3]) {
    const tierItems = items
      .filter((item) => item.source_tier === tier)
      .sort(compareDailyCandidates);
    for (const item of tierItems) {
      if (selected.length >= limit) return selected;
      if (consumed.has(item.id) || used.has(item.id) || used.has(item.url)) continue;
      selected.push(item);
      used.add(item.id);
      if (item.url) used.add(item.url);
    }
  }
  return selected;
}

function compareDailyCandidates(a, b) {
  const verifiedFirst = Number((b.verification_status === "verified") - (a.verification_status === "verified"));
  if (verifiedFirst) return verifiedFirst;
  const tierOrder = (a.source_tier ?? 9) - (b.source_tier ?? 9);
  if (tierOrder) return tierOrder;
  const relevance = (b.relevance_score ?? 0) - (a.relevance_score ?? 0);
  if (relevance) return relevance;
  return new Date(b.published_at ?? b.discovered_at ?? 0) - new Date(a.published_at ?? a.discovered_at ?? 0);
}

function toBriefingArticle(item, now) {
  const sourceRegistryEntry = sourceRegistry.find((source) => source.id === item.source_id);
  const corroboratingSources = buildCorroboratingSources(item, sourceRegistryEntry);
  const sourceNotes = sourceRegistryEntry?.notes || "";
  const tags = unique([
    ...(item.matched_keywords ?? []).map((keyword) => keyword.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")),
    item.category,
    item.source_type,
    item.source_tier === 1 ? "primary_source" : item.source_tier === 2 ? "discovery_source" : "wire_source"
  ].filter(Boolean)).slice(0, 6);

  return {
    id: item.id,
    title: item.title,
    sourceName: item.source_name,
    sourceType: item.source_type,
    url: item.url,
    publishedDate: dateOnly(item.published_at ?? now),
    tags,
    summary: buildSummary(item, sourceNotes),
    whyItMatters: buildWhyItMatters(item, sourceNotes),
    corroboratingSources,
    importanceScore: item.relevance_score,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

function buildSummary(item, notes) {
  const focus = item.matched_keywords?.length ? item.matched_keywords.slice(0, 3).join(", ") : item.category.replaceAll("_", " ");
  const summary = item.snippet?.trim() || notes;
  return [
    summary ? summary.replace(/\s+/g, " ") : `US Grid Explorer flagged this source because it tracks ${focus || "grid and data-center infrastructure"}.`,
    `The item is useful as a ${item.source_tier === 1 ? "primary" : item.source_tier === 2 ? "secondary" : "discovery"} signal for electricity demand, grid connection, and project tracking.`
  ].join(" ");
}

function buildWhyItMatters(item, notes) {
  if (item.source_tier === 1) {
    return "Tier 1 material is the most reliable layer for facts that can anchor a public briefing.";
  }
  if (item.source_tier === 2) {
    return "Tier 2 coverage is useful for discovery, but the important facts should still be cross-checked against Tier 1 when possible.";
  }
  return "Tier 3 coverage can surface a new signal quickly, but it needs primary-source verification before publication.";
}

function buildCorroboratingSources(item, sourceRegistryEntry) {
  const matched = new Set();
  const sources = [];
  if (item.source_tier === 1 && sourceRegistryEntry?.source_url) {
    sources.push({ label: sourceRegistryEntry.source_name, url: sourceRegistryEntry.source_url });
    return sources;
  }
  for (const sourceId of item.verification_sources ?? []) {
    const registryEntry = sourceRegistry.find((source) => source.id === sourceId);
    if (!registryEntry?.source_url || matched.has(registryEntry.source_url)) continue;
    matched.add(registryEntry.source_url);
    sources.push({ label: registryEntry.source_name, url: registryEntry.source_url });
  }
  if (!sources.length && sourceRegistryEntry?.source_url) {
    sources.push({ label: sourceRegistryEntry.source_name, url: sourceRegistryEntry.source_url });
  }
  return sources;
}

function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function unique(values) {
  return [...new Set(values)];
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, payload) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const result = await runDailyFeedBatch();
  console.log(`Generated ${result.selectedCount} daily briefing draft(s) from ${result.relevantCount} relevant source item(s).`);
  for (const error of result.errors) console.warn(`${error.source_id}: ${error.message}`);
}
