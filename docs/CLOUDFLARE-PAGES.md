# Cloudflare Pages Deployment

The public site deploys from this repository with Cloudflare Pages Git integration.

## Required configuration

- Production branch: `main`
- Framework preset: None
- Root directory: repository root
- Build command: `exit 0`
- Build output directory: `.`
- Secret: `YOUTUBE_API_KEY`

Configure `YOUTUBE_API_KEY` in the Cloudflare Pages project after the project
exists. It is a Cloudflare secret, not a repository file or browser setting.

## Livestream function

`functions/api/youtube-latest.js` is served as
`GET /api/youtube-latest`. It checks the configured YouTube channel for an
active embeddable live stream, then falls back to the newest embeddable video.
The response contains only `videoId` and `source`.

Successful responses are cached for five minutes at the edge. Failed responses
are not cached.

## Local test

Run the function tests without calling YouTube:

```sh
node --experimental-default-type=module --test tests/youtube-latest.test.js
```

The test suite uses mocked YouTube responses. Local Pages emulation with
Wrangler is optional; the deployed project needs the `YOUTUBE_API_KEY` secret
before the livestream endpoint can return a video.
