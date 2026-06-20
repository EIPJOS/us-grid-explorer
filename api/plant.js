import { readFileSync } from "node:fs";
import { findRelatedPlants, renderPlantPage } from "../server/render-plant-page.mjs";

let plantCache;

export default function handler(request, response) {
  const plantCode = Number(request.query?.id);
  if (!Number.isInteger(plantCode) || plantCode <= 0) return response.status(400).send("Invalid EIA plant code.");
  const { plants, byCode } = loadPlants();
  const plant = byCode.get(plantCode);
  if (!plant) return response.status(404).send("Power plant not found.");
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  return response.status(200).send(renderPlantPage(plant, findRelatedPlants(plants, plant)));
}

function loadPlants() {
  if (plantCache) return plantCache;
  const payload = JSON.parse(readFileSync(new URL("../public/data/power-plants.json", import.meta.url), "utf8"));
  plantCache = { plants: payload.features, byCode: new Map(payload.features.map((plant) => [plant.properties.plantCode, plant])) };
  return plantCache;
}
