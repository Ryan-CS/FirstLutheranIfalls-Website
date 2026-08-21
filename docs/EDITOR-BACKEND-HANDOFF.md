# Editor/backend handoff for the Website repository

**Status date:** 2026-08-21

This repository is the canonical public-content repository for the First Lutheran website. The detailed system architecture lives in `FirstLutheranIfalls-Editor/docs/ARCHITECTURE-HANDOFF.md`; this file records the Website-side contract so future work in this repository does not accidentally break the editor/publishing model.

## Current role

The active/default branch is currently `migration/github-pages-worker-test`. The branch name is historical: it is the branch being used by the working GitHub Pages + Cloudflare Worker architecture. Do not assume `main` is newer or authoritative simply because it is named `main`.

The public site is static and is delivered by GitHub Pages at `firstlutheranifalls.site` during this phase.

The companion `FirstLutheranIfalls-Editor` repository hosts the static admin UI at `admin.firstlutheranifalls.site` and contains the Cloudflare Worker backend.

## Branch contract

```text
migration/github-pages-worker-test  = published website state
editor-test-draft                    = unpublished editor state
```

The editor's **Save Draft** operation commits page/image changes to `editor-test-draft` through the GitHub API. It does not modify this repository's published branch.

The editor's **Publish** operation first compares the two branches. It advances `migration/github-pages-worker-test` only when `editor-test-draft` is a clean descendant of it. The update is a non-force fast-forward.

If the branches diverge, publication is intentionally blocked. This prevents the editor from overwriting a direct repository change made after a draft was created.

The editor's **Discard** operation may force-reset `editor-test-draft` to the current published SHA. It never force-resets the published branch.

## Implication for direct GitHub edits

Direct commits to `migration/github-pages-worker-test` are allowed administratively, but check for unpublished editor work first. If a draft exists and the target advances independently, the next editor Publish should stop with a conflict. That is expected safety behavior, not a broken Worker.

Do not solve such a conflict by teaching the Worker to force-push the target. Reconcile the draft deliberately or discard it.

## What the Worker is allowed to edit

The Worker is intentionally constrained. Page editing currently accepts top-level HTML filenames, not arbitrary repository paths. Editor uploads are written under:

```text
uploads/editor/
```

The browser never receives the GitHub write token. The Worker holds the GitHub credential as a runtime secret and performs the constrained GitHub API operations on the browser's behalf.

## Page-template/editor contract

The visual editor does not intend to make the entire HTML document editable. Site-wide chrome is protected:

- header/top navigation is locked;
- footer is locked;
- page content regions are editable;
- internal navigation in the editor preview loads the destination page into the editor;
- saving reconstructs the page using the original locked structure and edited content regions.

When changing HTML templates, verify that the editor still recognizes the intended editable regions (`.hero` and/or `main#main` in the current implementation). A major template rewrite can therefore be a cross-repository change even though this repository contains only the public website.

## GitHub Pages and custom domain

The `CNAME` at the Pages publication source belongs to the public website custom domain. Avoid configuring the same apex domain on a second active GitHub Pages repository; competing Pages custom-domain claims can produce confusing DNS/certificate behavior.

During the `.site` migration, authoritative DNS was moved to GoDaddy nameservers while an old Cloudflare zone still remained visible/paused. Provider dashboard presence is not DNS authority. Diagnose routing using the delegated nameservers and actual A/AAAA/CNAME answers.

GitHub Pages certificate failures are infrastructure/DNS problems unless proven otherwise. `ERR_CERT_COMMON_NAME_INVALID` or a `*.github.io` certificate presented for the custom domain is not caused by mixed content. Mixed content occurs only after a valid HTTPS page has loaded and requests insecure subresources.

## Deployment flow

Normal editor publication is:

```text
staff edits page
    -> Save Draft
editor-test-draft advances
    -> Publish
migration/github-pages-worker-test fast-forwards
    -> GitHub Pages deploys
firstlutheranifalls.site changes
```

Therefore a successful Worker Publish and a completed GitHub Pages deployment are two separate events. If Publish succeeds but the site still looks old, check the target branch SHA and Pages deployment before changing editor code.

## Recovery

Git commits are the primary version and recovery history. There is no required local RyskStick checkout, filesystem backup directory, Node publishing server, systemd service, or Cloudflare Tunnel in the current architecture.

If a published rollback is necessary, perform an explicit reviewed Git operation, then deliberately realign `editor-test-draft` so future Publish ancestry is clear.

## Cross-repository invariants

Preserve these unless the architecture is consciously replaced:

1. This repository is the canonical public-content source.
2. Save and Publish remain separate operations.
3. Publish never force-overwrites this repository's published branch.
4. The draft branch is disposable; the published branch is not.
5. The browser never gets a GitHub write credential.
6. The editor backend cannot mutate arbitrary repository paths.
7. Public site availability does not depend on a local computer.
8. Website template changes that alter editable content boundaries must be tested in the companion editor.

For backend implementation details, security boundaries, API endpoints, DNS migration lessons, failure modes, and the rationale for retiring the local Node/RyskStick design, see the companion Editor repository's `docs/ARCHITECTURE-HANDOFF.md`.