import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { findRelatedPlants, renderPlantPage } from "./server/render-plant-page.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const verificationToken = process.env.VITE_GOOGLE_SITE_VERIFICATION || env.VITE_GOOGLE_SITE_VERIFICATION;
  return {
    plugins: [staticPageRoutes(), searchConsoleVerification(verificationToken), react()]
  };
});

function searchConsoleVerification(token) {
  return {
    name: "search-console-verification",
    transformIndexHtml() {
      if (!token) return [];
      return [{ tag: "meta", attrs: { name: "google-site-verification", content: token }, injectTo: "head" }];
    }
  };
}

function staticPageRoutes() {
  const trustRoutes = new Set(["about", "methodology", "sources", "privacy", "terms", "corrections"]);
  let plantData;
  const rewrite = (request, response, next) => {
    const [pathname, query] = request.url.split("?");
    const plantMatch = pathname.match(/^\/plants\/(\d+)\/?$/);
    if (plantMatch) {
      plantData ??= loadPlantData();
      const plant = plantData.byCode.get(Number(plantMatch[1]));
      response.statusCode = plant ? 200 : 404;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      return response.end(plant ? renderPlantPage(plant, findRelatedPlants(plantData.plants, plant)) : "Power plant not found.");
    } else if (/^\/states\/?$/.test(pathname)) {
      request.url = `/states/index.html${query ? `?${query}` : ""}`;
    } else if (/^\/states\/[a-z-]+\/?$/.test(pathname)) {
      request.url = `${pathname.replace(/\/$/, "")}/index.html${query ? `?${query}` : ""}`;
    } else {
      const route = pathname.replaceAll("/", "");
      if (trustRoutes.has(route)) request.url = `/${route}/index.html${query ? `?${query}` : ""}`;
    }
    next();
  };

  return {
    name: "static-page-clean-urls",
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    }
  };
}

function loadPlantData() {
  const payload = JSON.parse(readFileSync(new URL("./public/data/power-plants.json", import.meta.url), "utf8"));
  return { plants: payload.features, byCode: new Map(payload.features.map((plant) => [plant.properties.plantCode, plant])) };
}
