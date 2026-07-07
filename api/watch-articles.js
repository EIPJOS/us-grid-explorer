/**
 * GET /api/watch-articles?limit=30
 *
 * Serves the automated daily research articles from Supabase to the frontend.
 * Uses the anon key (read-only via Row Level Security), so it is safe to run
 * in a public serverless function.
 *
 * Required Vercel environment variables:
 *   SUPABASE_URL       e.g. https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY  Supabase anon/public key
 */
export default async function handler(request, response) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !anonKey) {
    return response.status(500).json({ mode: "error", message: "Supabase environment variables are not configured.", items: [] });
  }

  const limit = Math.min(Math.max(Number(request.query?.limit) || 30, 1), 100);
  const endpoint =
    `${supabaseUrl}/rest/v1/watch_articles` +
    `?select=id,title,source_name,source_type,source_tier,url,published_date,summary,why_it_matters,tags,corroborating_sources,importance_score,created_at,updated_at` +
    `&status=eq.published&order=published_date.desc,created_at.desc&limit=${limit}`;

  try {
    const upstream = await fetch(endpoint, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: AbortSignal.timeout(15000)
    });
    if (!upstream.ok) throw new Error(`Supabase returned HTTP ${upstream.status}`);
    const rows = await upstream.json();

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=86400");
    return response.status(200).json({
      mode: "live",
      source: "US Grid Explorer research desk",
      fetchedAt: new Date().toISOString(),
      items: rows.map(toCardItem)
    });
  } catch (error) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.status(502).json({
      mode: "error",
      message: error instanceof Error ? error.message : "Article feed unavailable.",
      items: []
    });
  }
}

/** Map Supabase snake_case rows to the exact shape DataCenterWatchCard expects. */
function toCardItem(row) {
  return {
    id: row.id,
    title: row.title,
    sourceName: row.source_name,
    sourceType: row.source_type ?? "media",
    url: row.url,
    publishedDate: row.published_date,
    tags: Array.isArray(row.tags) ? row.tags : [],
    summary: row.summary,
    whyItMatters: row.why_it_matters ?? "",
    corroboratingSources: Array.isArray(row.corroborating_sources) ? row.corroborating_sources : [],
    importanceScore: row.importance_score ?? 70,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
