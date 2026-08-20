import assert from "node:assert/strict";
import test from "node:test";
import {
  handleRequest,
  resolveVideo,
  videoIdFromFeed,
} from "../functions/api/youtube-latest.js";

const latestVideoId = "latestVid02";

function context() {
  return {
    request: new Request("https://example.pages.dev/api/youtube-latest"),
  };
}

function feedXml(videoId = latestVideoId) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><yt:videoId>${videoId}</yt:videoId></entry></feed>`;
}

test("returns the newest video ID from the public YouTube RSS feed", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return new Response(feedXml(), { status: 200 });
  };

  const response = await handleRequest(context(), {
    fetchImpl,
    cache: null,
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    videoId: latestVideoId,
    source: "rss",
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /youtube\.com\/feeds\/videos\.xml\?channel_id=/);
  assert.equal(
    response.headers.get("Cache-Control"),
    "public, max-age=60, s-maxage=300, stale-while-revalidate=60",
  );
});

test("RSS lookup requires no API key", async () => {
  const result = await resolveVideo({
    fetchImpl: async () => new Response(feedXml(), { status: 200 }),
  });

  assert.deepEqual(result, { videoId: latestVideoId, source: "rss" });
});

test("returns a generic failure when the YouTube feed returns an error", async () => {
  const response = await handleRequest(context(), {
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
    cache: null,
  });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Unable to load a YouTube video",
  });
});

test("rejects malformed or invalid feed video IDs", async () => {
  assert.equal(videoIdFromFeed("<feed></feed>"), null);
  assert.equal(videoIdFromFeed(feedXml("bad")), null);

  const response = await handleRequest(context(), {
    fetchImpl: async () => new Response("<feed></feed>", { status: 200 }),
    cache: null,
  });
  assert.equal(response.status, 502);
});
