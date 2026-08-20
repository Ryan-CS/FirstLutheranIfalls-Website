# Legacy Cloudflare Pages notes

Production previously targeted Cloudflare Pages from this repository. The `migration/github-pages-worker-test` branch instead demonstrates GitHub Pages for static hosting plus a separate Cloudflare Worker for dynamic API calls.

## Livestream behavior

The livestream lookup now mirrors the deployed First Lutheran server: it reads YouTube's public RSS feed for channel `UC4mlfLEMZkdyfi7KMcvzYmw`, extracts the newest valid video ID, and returns it as JSON.

No `YOUTUBE_API_KEY` is required for this behavior.

The compatibility function at `functions/api/youtube-latest.js` remains in the repository, but the migration test's active API implementation is `worker/src/index.js`, exposed by the `first-lutheran-site-api` Worker as `GET /api/youtube-latest`.

Successful responses are cached for five minutes at the edge. Failed responses are not cached.

## Local compatibility test

Run the function tests without contacting YouTube:

```sh
node --experimental-default-type=module --test tests/youtube-latest.test.js
```

The tests use a mocked RSS response and require no secret configuration.

For the current migration test deployment instructions, see `docs/GITHUB-PAGES-WORKER-TEST.md`.
