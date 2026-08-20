const CHANNEL_ID = "UC4mlfLEMZkdyfi7KMcvzYmw";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_SECONDS = 300;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function apiHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Cache-Control": "no-store",
    ...extra,
  };
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: apiHeaders(headers),
  });
}

function buildSearchUrl(apiKey, options = {}) {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "id");
  url.searchParams.set("channelId", CHANNEL_ID);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  if (options.eventType) url.searchParams.set("eventType", options.eventType);
  if (options.order) url.searchParams.set("order", options.order);
  return url;
}

function videoIdFromPayload(payload) {
  const item = payload?.items?.find((candidate) =>
    VIDEO_ID_PATTERN.test(candidate?.id?.videoId || ""),
  );
  return item?.id?.videoId || null;
}

async function searchYouTube(apiKey, options) {
  const response = await fetch(buildSearchUrl(apiKey, options));
  if (!response.ok) {
    throw new Error(`YouTube API returned ${response.status}`);
  }
  const payload = await response.json();
  return videoIdFromPayload(payload);
}

async function resolveVideo(apiKey) {
  const liveVideoId = await searchYouTube(apiKey, { eventType: "live" });
  if (liveVideoId) return { videoId: liveVideoId, source: "live" };

  const latestVideoId = await searchYouTube(apiKey, { order: "date" });
  if (!latestVideoId) throw new Error("No embeddable video found");
  return { videoId: latestVideoId, source: "latest" };
}

async function youtubeLatest(request, env, ctx) {
  const apiKey = env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: "YouTube service is not configured" }, 503);
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL("/__cache/youtube-latest", request.url), {
    method: "GET",
  });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const result = await resolveVideo(apiKey);
    const response = json(result, 200, {
      "Cache-Control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
    });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return json({ error: "Unable to load a YouTube video" }, 502);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: apiHeaders() });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, { Allow: "GET, OPTIONS" });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "first-lutheran-site-api",
        environment: "firstlutheranifalls.site test",
        youtubeConfigured: Boolean(env.YOUTUBE_API_KEY),
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/youtube-latest") {
      return youtubeLatest(request, env, ctx);
    }

    return json({ error: "Not found" }, 404);
  },
};
