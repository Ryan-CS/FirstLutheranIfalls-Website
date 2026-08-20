const CHANNEL_ID = "UC4mlfLEMZkdyfi7KMcvzYmw";
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const CACHE_SECONDS = 300;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function cacheHeaders() {
  return {
    "Cache-Control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
  };
}

export function videoIdFromFeed(xml) {
  const match = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  const videoId = match?.[1]?.trim() || "";
  return VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

export async function resolveVideo({ fetchImpl = fetch } = {}) {
  const response = await fetchImpl(YOUTUBE_FEED_URL, {
    headers: {
      Accept: "application/atom+xml, application/xml, text/xml",
      "User-Agent": "FirstLutheranIfalls/1.0",
    },
  });
  if (!response.ok) {
    throw new Error("YouTube feed request failed");
  }

  const xml = await response.text();
  const videoId = videoIdFromFeed(xml);
  if (!videoId) {
    throw new Error("No valid video found in YouTube feed");
  }

  return { videoId, source: "rss" };
}

export async function handleRequest(context, dependencies = {}) {
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
    const result = await resolveVideo({ fetchImpl });
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
