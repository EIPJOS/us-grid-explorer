import { sourceRegistry } from "../src/data/sourceRegistry.js";

const required = ["id", "source_name", "source_url", "source_type", "category", "tier", "reliability_score", "fetch_method", "allowed_to_fetch_full_text", "paywall_risk", "notes", "enabled"];
const errors = [];
const ids = new Set();

for (const [index, source] of sourceRegistry.entries()) {
  for (const field of required) if (!(field in source)) errors.push(`Source ${index + 1} is missing ${field}`);
  if (ids.has(source.id)) errors.push(`Duplicate source id: ${source.id}`);
  ids.add(source.id);
  if (![1, 2, 3].includes(source.tier)) errors.push(`${source.id}: invalid tier`);
  if (source.reliability_score < 1 || source.reliability_score > 100) errors.push(`${source.id}: invalid reliability score`);
  if (!["low", "medium", "high"].includes(source.paywall_risk)) errors.push(`${source.id}: invalid paywall risk`);
  if (source.enabled && !source.source_url) errors.push(`${source.id}: enabled source has no URL`);
  if (source.paywall_risk === "high" && source.allowed_to_fetch_full_text) errors.push(`${source.id}: high-paywall source cannot fetch full text`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Validated ${sourceRegistry.length} content sources.`);
