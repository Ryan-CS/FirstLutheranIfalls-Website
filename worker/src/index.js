const CHANNEL_ID = "UC4mlfLEMZkdyfi7KMcvzYmw";
const YOUTUBE_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
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

function videoIdFromFeed(xml) {
  const match = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
  const videoId = match?.[1]?.trim() || "";
  return VIDEO_ID_PATTERN.test(videoId) ? videoId : null;
}

async function youtubeLatest(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/__cache/youtube-latest", request.url), {
    method: "GET",
  });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const upstream = await fetch(YOUTUBE_FEED_URL, {
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml",
        "User-Agent": "FirstLutheranIfalls/1.0",
      },
    });
    if (!upstream.ok) {
      throw new Error(`YouTube feed returned ${upstream.status}`);
    }

    const xml = await upstream.text();
    const videoId = videoIdFromFeed(xml);
    if (!videoId) throw new Error("No valid video ID found in YouTube feed");

    const response = json(
      { videoId, source: "rss" },
      200,
      {
        "Cache-Control": `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
      },
    );
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch {
    return json({ error: "Unable to load a YouTube video" }, 502);
  }
}

export default {
  async fetch(request, _env, ctx) {
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
        youtubeSource: "public-rss",
        secretsRequired: false,
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/youtube-latest") {
      return youtubeLatest(request, ctx);
    }

    return json({ error: "Not found" }, 404);
  },
};
