# GitHub Pages + Cloudflare Worker test

This branch is an isolated migration test for `firstlutheranifalls.site`. It does not change the production `main` branch or `firstlutheranifalls.org` deployment.

## Test architecture

- `firstlutheranifalls.site` — public site hosted by GitHub Pages from this branch.
- `admin.firstlutheranifalls.site` — editor frontend hosted by GitHub Pages from the Editor repository.
- `first-lutheran-site-api.ryan-skogstad.workers.dev` — public Cloudflare Worker API in `worker/`.
- `first-lutheran-editor-api.ryan-skogstad.workers.dev` — authenticated editor Worker API in the Editor repository.
- GitHub remains the canonical content store. The editor test publishes only to this migration branch.

## GitHub Pages

Repository Settings → Pages must use **GitHub Actions** as the source. The workflow `.github/workflows/test-pages.yml` publishes only public website content and writes `firstlutheranifalls.site` as the test custom domain.

The repository may need to be public, or the GitHub account must have a plan that supports Pages for private repositories.

## Public Worker

Create/import a Cloudflare Worker from the `worker/` directory on this branch.

- Worker name: `first-lutheran-site-api`
- Root directory: `worker`
- Deploy command: `npx wrangler deploy`
- Secret: `YOUTUBE_API_KEY`

The Worker exposes:

- `GET /api/health`
- `GET /api/youtube-latest`

The API contains no static site hosting and can stay on the `workers.dev` hostname.

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

Configure `firstlutheranifalls.site` as this repository's Pages custom domain and `admin.firstlutheranifalls.site` as the Editor repository's Pages custom domain. Enable **Enforce HTTPS** after GitHub validates DNS.

## Verification

After the Pages and Worker deployments are active:

1. Open `https://firstlutheranifalls.site/system-status.html`.
2. Confirm **Frontend host** shows the expected test origin.
3. Confirm **Public Worker API** reports Connected.
4. Confirm **YouTube secret** reports Configured without displaying its value.
5. Open `/livestream.html` and verify it loads video data through the Worker.
6. Open `https://admin.firstlutheranifalls.site/` and test the editor workflow.

## Safety boundary

No API key or GitHub credential belongs in this repository. Local Worker secrets belong in `worker/.dev.vars` and deployed secrets belong in Cloudflare Worker secrets. `worker/.dev.vars` is intentionally ignored by Git.
