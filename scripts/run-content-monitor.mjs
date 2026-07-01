import { readFile, writeFile } from "node:fs/promises";
import { sourceRegistry, contentPipelineDefaults } from "../src/data/sourceRegistry.js";
import { runMonitor } from "../server/content-pipeline.mjs";

const queueUrl = new URL("../tools/feed-studio/data/feed-review-queue.json", import.meta.url);
const enabled = envBoolean("CONTENT_PIPELINE_ENABLED", contentPipelineDefaults.CONTENT_PIPELINE_ENABLED);
const autoPublish = envBoolean("AUTO_PUBLISH", contentPipelineDefaults.AUTO_PUBLISH);
const minScore = envNumber("MIN_RELEVANCE_SCORE", contentPipelineDefaults.MIN_RELEVANCE_SCORE);
const maxItems = envNumber("MAX_ARTICLES_PER_RUN", contentPipelineDefaults.MAX_ARTICLES_PER_RUN);

if (!enabled) {
  console.log("Content pipeline is disabled.");
  process.exit(0);
}
if (autoPublish) throw new Error("AUTO_PUBLISH must remain false until a reviewed publishing workflow exists.");

const existing = await readJson(queueUrl, []);
const result = await runMonitor({ sources: sourceRegistry, existing, minScore, maxItems });
await writeFile(queueUrl, `${JSON.stringify(result.items, null, 2)}\n`, "utf8");
console.log(`Fetched ${result.fetched_count} items; retained ${result.relevant_count}; queue contains ${result.items.length}.`);
for (const error of result.errors) console.warn(`${error.source_id}: ${error.message}`);

async function readJson(url, fallback) { try { return JSON.parse(await readFile(url, "utf8")); } catch { return fallback; } }
function envBoolean(name, fallback) { return process.env[name] == null ? fallback : process.env[name].toLowerCase() === "true"; }
function envNumber(name, fallback) { const value = Number(process.env[name]); return Number.isFinite(value) ? value : fallback; }
