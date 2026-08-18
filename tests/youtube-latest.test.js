import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchUrl,
  handleRequest,
  resolveVideo
} from "../functions/api/youtube-latest.js";

const liveVideoId = "liveVideo01";
const latestVideoId = "latestVid02";

function context(apiKey = "test-api-key") {
  return {
    env: { YOUTUBE_API_KEY: apiKey },
    request: new Request("https://example.pages.dev/api/youtube-latest")
  };
}

function mockFetch(responses) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    }
  };
}

function youtubeResponse(items, status = 200) {
  return new Response(JSON.stringify({ items }), { status });
}

test("returns an active live stream when YouTube reports one", async () => {
  const mock = mockFetch([
    youtubeResponse([{ id: { videoId: liveVideoId } }])
  ]);

  const response = await handleRequest(context(), {
    fetchImpl: mock.fetchImpl,
    cache: null
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    videoId: liveVideoId,
    source: "live"
  });
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].searchParams.get("eventType"), "live");
  assert.equal(mock.calls[0].searchParams.get("videoEmbeddable"), "true");
  assert.equal(response.headers.get("Cache-Control"), "public, max-age=60, s-maxage=300, stale-while-revalidate=60");
});

test("falls back to the newest embeddable video when no live stream exists", async () => {
  const mock = mockFetch([
    youtubeResponse([]),
    youtubeResponse([{ id: { videoId: latestVideoId } }])
  ]);

  const result = await resolveVideo({
    apiKey: "test-api-key",
    fetchImpl: mock.fetchImpl
  });

  assert.deepEqual(result, { videoId: latestVideoId, source: "latest" });
  assert.equal(mock.calls.length, 2);
  assert.equal(mock.calls[0].searchParams.get("eventType"), "live");
  assert.equal(mock.calls[1].searchParams.get("order"), "date");
});

test("returns a generic failure when YouTube returns an error", async () => {
  const mock = mockFetch([youtubeResponse([], 403)]);

  const response = await handleRequest(context(), {
    fetchImpl: mock.fetchImpl,
    cache: null
  });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Unable to load a YouTube video"
  });
});

test("rejects malformed or empty YouTube results", async () => {
  const malformed = mockFetch([
    new Response("not json", { status: 200 })
  ]);
  const malformedResponse = await handleRequest(context(), {
    fetchImpl: malformed.fetchImpl,
    cache: null
  });
  assert.equal(malformedResponse.status, 502);

  const empty = mockFetch([
    youtubeResponse([]),
    youtubeResponse([])
  ]);
  const emptyResponse = await handleRequest(context(), {
    fetchImpl: empty.fetchImpl,
    cache: null
  });
  assert.equal(emptyResponse.status, 502);
});

test("requires a secret and never returns it to the browser", async () => {
  const secret = "do-not-expose-this-key";
  const missingKeyResponse = await handleRequest(context(""), {
    cache: null
  });
  assert.equal(missingKeyResponse.status, 503);
  assert.equal((await missingKeyResponse.text()).includes(secret), false);

  const mock = mockFetch([
    youtubeResponse([{ id: { videoId: liveVideoId } }])
  ]);
  const successResponse = await handleRequest(context(secret), {
    fetchImpl: mock.fetchImpl,
    cache: null
  });
  const body = await successResponse.text();

  assert.equal(body.includes(secret), false);
  assert.equal(buildSearchUrl(secret, { eventType: "live" }).searchParams.get("key"), secret);
});
