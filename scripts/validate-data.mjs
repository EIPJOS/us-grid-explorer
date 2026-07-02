import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const validStateCodes = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR", "VI", "GU", "AS", "MP"
]);

const datasets = [
  {
    label: "power plants",
    file: "public/data/power-plants.json",
    requiredProperties: ["plantCode", "utilityName", "state", "primaryFuel", "projectStatus"]
  },
  {
    label: "data centers",
    file: "public/data/data-centers.json",
    requiredProperties: ["osmType", "osmId", "status", "coverage"],
    warnOnMissingState: true
  }
];

const errors = [];
const warnings = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function hasCheckedDate(source) {
  return Boolean(source.checkedAt || source.lastChecked || source.last_checked || source.checked_at);
}

function validateSourceMetadata(dataset, json) {
  const sources = json.meta?.sources;
  if (!sources || typeof sources !== "object" || !Object.keys(sources).length) {
    errors.push(`${dataset.label}: meta.sources is missing or empty`);
    return new Set();
  }

  for (const [sourceKey, source] of Object.entries(sources)) {
    if (!source.publisher) errors.push(`${dataset.label}: source ${sourceKey} missing publisher`);
    if (!source.dataset) errors.push(`${dataset.label}: source ${sourceKey} missing dataset`);
    if (!source.url) errors.push(`${dataset.label}: source ${sourceKey} missing url`);
    if (!hasCheckedDate(source)) errors.push(`${dataset.label}: source ${sourceKey} missing checkedAt/lastChecked date`);
  }

  return new Set(Object.keys(sources));
}

function validatePointGeometry(dataset, feature) {
  if (feature.geometry?.type !== "Point") {
    errors.push(`${dataset.label}: ${feature.id || "unknown id"} geometry must be Point`);
    return;
  }

  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    errors.push(`${dataset.label}: ${feature.id || "unknown id"} coordinates are missing`);
    return;
  }

  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    errors.push(`${dataset.label}: ${feature.id} coordinates must be finite numbers`);
    return;
  }

  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    errors.push(`${dataset.label}: ${feature.id} coordinates out of range (${lng}, ${lat})`);
  }
}

function validateFeatureDataset(dataset) {
  const json = readJson(dataset.file);
  const validSources = validateSourceMetadata(dataset, json);

  if (!Array.isArray(json.features) || !json.features.length) {
    errors.push(`${dataset.label}: features array is missing or empty`);
    return;
  }

  const ids = new Set();
  let missingStateCount = 0;
  for (const feature of json.features) {
    if (!feature.id) {
      errors.push(`${dataset.label}: feature missing id`);
    } else if (ids.has(feature.id)) {
      errors.push(`${dataset.label}: duplicate id ${feature.id}`);
    } else {
      ids.add(feature.id);
    }

    if (!feature.name) errors.push(`${dataset.label}: ${feature.id || "unknown id"} missing name`);
    if (!feature.sourceRef) errors.push(`${dataset.label}: ${feature.id || "unknown id"} missing sourceRef`);
    if (feature.sourceRef && !validSources.has(feature.sourceRef)) {
      errors.push(`${dataset.label}: ${feature.id} sourceRef ${feature.sourceRef} is not in meta.sources`);
    }

    validatePointGeometry(dataset, feature);

    const properties = feature.properties || {};
    for (const property of dataset.requiredProperties) {
      if (properties[property] === undefined || properties[property] === null || properties[property] === "") {
        errors.push(`${dataset.label}: ${feature.id || "unknown id"} missing properties.${property}`);
      }
    }

    if (properties.state && !validStateCodes.has(properties.state)) {
      errors.push(`${dataset.label}: ${feature.id || "unknown id"} has invalid state code ${properties.state}`);
    }

    if (!properties.state && dataset.warnOnMissingState) {
      missingStateCount += 1;
    }
  }

  console.log(`Validated ${ids.size.toLocaleString()} ${dataset.label} records`);
  if (missingStateCount) {
    warnings.push(`${dataset.label}: ${missingStateCount.toLocaleString()} records are missing state tags from the source dataset`);
  }
}

function validateStateAnalysis() {
  const json = readJson("public/data/state-analysis.json");
  if (!Array.isArray(json.states) || !json.states.length) {
    errors.push("state analysis: states array is missing or empty");
    return;
  }

  const seen = new Set();
  for (const state of json.states) {
    if (!state.state || !validStateCodes.has(state.state)) {
      errors.push(`state analysis: invalid state code ${state.state || "(missing)"}`);
    }
    if (state.state && seen.has(state.state)) {
      errors.push(`state analysis: duplicate state ${state.state}`);
    }
    seen.add(state.state);

    for (const numberField of ["plantCount", "operatingCapacityMw", "proposedCapacityMw"]) {
      if (!Number.isFinite(state[numberField])) {
        errors.push(`state analysis: ${state.state} missing numeric ${numberField}`);
      }
    }
  }

  if (!json.meta?.sources || !Object.keys(json.meta.sources).length) {
    warnings.push("state analysis: meta.sources is missing; source details are documented in docs/DATA_SOURCES.md");
  }

  console.log(`Validated ${seen.size.toLocaleString()} state analysis records`);
}

function validateDailyFeedBatch() {
  const batchPath = path.join(root, "src/data/generated/daily-feed-batch.json");
  if (!fs.existsSync(batchPath)) {
    errors.push("daily feed batch: src/data/generated/daily-feed-batch.json is missing");
    return;
  }

  const json = readJson("src/data/generated/daily-feed-batch.json");
  if (!json || typeof json !== "object") {
    errors.push("daily feed batch: file must contain a JSON object");
    return;
  }

  if (!Array.isArray(json.items)) {
    errors.push("daily feed batch: items array is missing");
    return;
  }

  if (json.items.length > 3) {
    errors.push(`daily feed batch: contains ${json.items.length} items; maximum is 3`);
  }

  const seen = new Set();
  for (const item of json.items) {
    if (!item.id) errors.push("daily feed batch: item missing id");
    if (item.id && seen.has(item.id)) errors.push(`daily feed batch: duplicate item id ${item.id}`);
    if (item.id) seen.add(item.id);

    for (const field of ["title", "sourceName", "sourceType", "url", "summary", "whyItMatters", "publishedDate"]) {
      if (!item[field]) errors.push(`daily feed batch: ${item.id || "unknown item"} missing ${field}`);
    }

    if (item.corroboratingSources != null && !Array.isArray(item.corroboratingSources)) {
      errors.push(`daily feed batch: ${item.id || "unknown item"} corroboratingSources must be an array when present`);
    }
  }

  console.log(`Validated ${json.items.length.toLocaleString()} daily feed batch records`);
}

for (const dataset of datasets) {
  validateFeatureDataset(dataset);
}
validateStateAnalysis();
validateDailyFeedBatch();

for (const warning of warnings) {
  console.warn(`Warning: ${warning}`);
}

if (errors.length) {
  console.error("\nData validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Data validation passed");
