export const featureTypes = Object.freeze({
  DATA_CENTER: "data_center",
  POWER_PLANT: "power_plant",
  SUBSTATION: "substation",
  TRANSMISSION_LINE: "transmission_line",
  QUEUE_PROJECT: "queue_project"
});

export const confidenceLevels = Object.freeze({
  VERIFIED: "verified",
  REPORTED: "reported",
  ESTIMATED: "estimated"
});

export const freshnessCadences = Object.freeze({
  LIVE: "live",
  HOURLY: "hourly",
  DAILY: "daily",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  ANNUAL: "annual",
  MANUAL: "manual"
});

export function validateMapFeature(feature) {
  const errors = [];

  if (!feature?.id) errors.push("id is required");
  if (!feature?.type) errors.push("type is required");
  if (!feature?.name) errors.push("name is required");
  if (!feature?.geometry?.type) errors.push("geometry.type is required");
  if (!Array.isArray(feature?.geometry?.coordinates)) {
    errors.push("geometry.coordinates must be an array");
  }
  if (!feature?.sourceRef && !feature?.source?.url) {
    errors.push("sourceRef or source.url is required");
  }
  if (feature?.source && !feature.source.checkedAt) {
    errors.push("source.checkedAt is required when source is embedded");
  }
  if (feature?.source && !feature.source.confidence) {
    errors.push("source.confidence is required when source is embedded");
  }

  return errors;
}

export function createPointFeature({
  id,
  type,
  name,
  longitude,
  latitude,
  properties = {},
  source
}) {
  return {
    id,
    type,
    name,
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude]
    },
    properties,
    source
  };
}
