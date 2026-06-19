import { track } from "@vercel/analytics";

export const analyticsEnabled = import.meta.env.PROD
  && import.meta.env.VITE_ANALYTICS_ENABLED === "true";

const EVENT_PROPERTIES = Object.freeze({
  "View Changed": ["view"],
  "Facility Search Selected": ["feature_type"],
  "Place Search Submitted": ["query_length"],
  "Place Search Completed": ["result_count", "outcome"],
  "Place Selected": ["result_type"],
  "Map Feature Selected": ["feature_type"],
  "Layer Toggled": ["layer", "enabled"],
  "Fuel Filter Changed": ["fuel", "enabled", "mode"],
  "State Comparison Updated": ["state_count", "state_codes"],
  "Map Tour Started": [],
  "Source Opened": ["source_ref", "feature_type"],
  "Area Report Generated": ["result_type", "state", "has_zip"],
  "Area Radius Changed": ["radius_miles"],
  "Area Report Shared": ["state"],
  "Area Opened On Map": ["state"]
});

export function trackEvent(name, properties = {}) {
  if (!analyticsEnabled || !EVENT_PROPERTIES[name]) return;
  const allowed = EVENT_PROPERTIES[name];
  const data = Object.fromEntries(
    allowed
      .filter((key) => properties[key] !== undefined)
      .map((key) => [key, sanitizeValue(properties[key])])
  );
  try {
    track(name, data);
  } catch (error) {
    console.warn(`Analytics event failed: ${error.message}`);
  }
}

export function queryLengthBucket(value) {
  const length = String(value ?? "").trim().length;
  if (length < 5) return "2-4";
  if (length < 10) return "5-9";
  if (length < 20) return "10-19";
  return "20+";
}

function sanitizeValue(value) {
  if (typeof value === "boolean" || typeof value === "number") return value;
  return String(value).slice(0, 64);
}
