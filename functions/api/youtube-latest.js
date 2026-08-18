const CHANNEL_ID = "UC4mlfLEMZkdyfi7KMcvzYmw";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const CACHE_SECONDS = 300;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function cacheHeaders() {
  return {
    "Cache-Control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`
  };
}

export function buildSearchUrl(apiKey, options = {}) {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "id");
  url.searchParams.set("channelId", CHANNEL_ID);
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  if (options.eventType) {
    url.searchParams.set("eventType", options.eventType);
  }
  if (options.order) {
    url.searchParams.set("order", options.order);
  }

  return url;
}

function videoIdFromPayload(payload) {
  const item = payload?.items?.find((candidate) =>
    VIDEO_ID_PATTERN.test(candidate?.id?.videoId || "")
  );
  return item?.id?.videoId || null;
}

async function searchYouTube(fetchImpl, apiKey, options) {
  const response = await fetchImpl(buildSearchUrl(apiKey, options));
  if (!response.ok) {
    throw new Error("YouTube request failed");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("YouTube returned invalid JSON");
  }

  return videoIdFromPayload(payload);
}

export async function resolveVideo({ apiKey, fetchImpl = fetch }) {
  const liveVideoId = await searchYouTube(fetchImpl, apiKey, {
    eventType: "live"
  });
  if (liveVideoId) {
    return { videoId: liveVideoId, source: "live" };
  }

  const latestVideoId = await searchYouTube(fetchImpl, apiKey, {
    order: "date"
  });
  if (!latestVideoId) {
    throw new Error("No embeddable video found");
  }

  return { videoId: latestVideoId, source: "latest" };
}

export async function handleRequest(context, dependencies = {}) {
  const apiKey = context.env?.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return jsonResponse(503, { error: "YouTube service is not configured" });
  }

  const fetchImpl = dependencies.fetchImpl || fetch;
  const cache = dependencies.cache === undefined
    ? globalThis.caches?.default
    : dependencies.cache;
  const cacheKey = cache ? new Request(context.request.url, { method: "GET" }) : null;

  if (cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  let response;
  try {
    const result = await resolveVideo({ apiKey, fetchImpl });
    response = jsonResponse(200, result, cacheHeaders());
  } catch {
    return jsonResponse(502, { error: "Unable to load a YouTube video" });
  }

  if (cacheKey) {
    const store = cache.put(cacheKey, response.clone());
    if (typeof context.waitUntil === "function") {
      context.waitUntil(store);
    } else {
      await store;
    }
  }

  return response;
}

export function onRequestGet(context) {
  return handleRequest(context);
}
