# GitHub Pages + Cloudflare Worker test

This branch is an isolated migration test for `firstlutheranifalls.site`. It does not change the production `main` branch or `firstlutheranifalls.org` deployment.

## Test architecture

- `firstlutheranifalls.site` — public site hosted by GitHub Pages from this branch.
- `admin.firstlutheranifalls.site` — editor frontend hosted by GitHub Pages from the Editor repository.
- `firstlutheranifalls-website.ryan-skogstad.workers.dev` — public Cloudflare Worker API in `worker/`.
- `firstlutheranifalls-editor.ryan-skogstad.workers.dev` — authenticated editor Worker API in the Editor repository.
- GitHub remains the canonical content store. The editor test publishes only to this migration branch.

## GitHub Pages

Repository Settings → Pages must use **GitHub Actions** as the source. The workflow `.github/workflows/test-pages.yml` publishes only public website content and writes `firstlutheranifalls.site` as the test custom domain.

The repository may need to be public, or the GitHub account must have a plan that supports Pages for private repositories.

## Public Worker

Create/import a Cloudflare Worker from the `worker/` directory on this branch.

- Worker name: `firstlutheranifalls-website`
- Root directory: `worker`
- Deploy command: `npx wrangler deploy`
- Secrets required: none

The Worker exposes:

- `GET /api/health`
- `GET /api/youtube-latest`

`/api/youtube-latest` mirrors the current production behavior by reading YouTube's public RSS feed for channel `UC4mlfLEMZkdyfi7KMcvzYmw`, extracting the first valid video ID, and caching the response at the edge. It does not use the YouTube Data API and does not require `YOUTUBE_API_KEY`.

The API contains no static site hosting and stays available on its `workers.dev` hostname. Preview URLs are disabled because the test frontend only needs the stable Worker URL.

## GoDaddy DNS for the test domain

For the apex GitHub Pages site, use GitHub Pages' standard A records:

```text
A  @  185.199.108.153
A  @  185.199.109.153
A  @  185.199.110.153
A  @  185.199.111.153
```

For `www` and the editor subdomain:

```text
CNAME  www    ryan-cs.github.io
CNAME  admin  ryan-cs.github.io
```

Configure `firstlutheranifalls.site` as this repository's Pages custom domain and `admin.firstlutheranifalls.site` as the Editor repository's Pages custom domain. Enable **Enforce HTTPS** after GitHub validates DNS and issues the certificates.

## Verification

After the Pages and Worker deployments are active:

1. Open `https://firstlutheranifalls.site/system-status.html`.
2. Confirm **Frontend host** shows the expected test origin.
3. Confirm **Public Worker API** reports Connected.
4. Confirm **YouTube source** reports Public RSS connected and the public Worker reports no secrets required.
5. Open `/livestream.html` and verify it loads video data through the Worker.
6. Open `https://admin.firstlutheranifalls.site/` and test the editor workflow.

## Safety boundary

The public website Worker currently has no secrets. The editor Worker still requires its GitHub/editor authentication secrets and must keep them only in Cloudflare Worker secrets. If future public API integrations require credentials, keep those values in Cloudflare and never commit them to this repository or browser code. Local secret files such as `worker/.dev.vars` remain ignored by Git.
