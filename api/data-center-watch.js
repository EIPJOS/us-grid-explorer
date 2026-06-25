import { fetchFederalRegisterWatchItems } from "../server/data-center-watch-normalizer.mjs";

export default async function handler(request, response) {
  try {
    const items = await fetchFederalRegisterWatchItems({ limit: Number(request.query?.limit) || 18 });
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return response.status(200).json({
      mode: "live",
      source: "Federal Register",
      fetchedAt: new Date().toISOString(),
      items
    });
  } catch (error) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(502).json({
      mode: "error",
      source: "Federal Register",
      message: error instanceof Error ? error.message : "Federal Register fetch failed.",
      items: []
    });
  }
}
