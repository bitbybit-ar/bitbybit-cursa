# BitByBit Cursá — agent instructions

This file is the canonical guide for any AI agent (or human) working on
the BitByBit Cursá project. Read it before editing the repo.

## Project shape

- Next.js 16 (App Router) project at `cursa.bitbybit.com.ar`.
- Lightning checkout for Argentine educators. Sats in via the Lightning
  Network, ARS out to the merchant's CBU/alias via **Wapu**.
- Built for La Crypta Hackathon #3 (Commerce). Wapu is the sponsor and
  the payment rail.
- next-intl (es default, en secondary). next-themes for light/dark.
- **Has a backend** — API routes for the Wapu webhook, scheduled jobs
  for the optional auto-renewal flow. Cursá is **not** static-only
  like the `home` repo.
- Deploys to Vercel from a private GitHub repo at
  <https://github.com/bitbybit-ar/bitbybit-cursa>.

## Documentation standard

Every document under `docs/` — plus the root `CHANGELOG.md`,
`CONTRIBUTING.md`, and `CLAUDE.md` itself — **must** follow the
structure below. ADR files and runbook files keep their own
specialized header (Status / Deciders / Date for ADRs; Owner /
Severity / Last reviewed for runbooks) but still carry an inline
`## Change Log` section.

Top-level files at the repo root:

- `README.md` — project overview, quick links.
- `CHANGELOG.md` — product release log (Keep a Changelog + SemVer).
- `CONTRIBUTING.md` — contribution flow + vulnerability disclosure.
- `CLAUDE.md` — this file.

Everything else under `docs/`.

### Required header

```markdown
# <Document title>

> **Status:** Active | Draft | Deprecated | Superseded by <link>
> **Last updated:** YYYY-MM-DD

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| YYYY-MM-DD | — | Initial version. | <why this doc exists> |

---
```

Rules for the header:

- **Status** values: `Active`, `Draft`, `Deprecated`, or
  `Superseded by <relative-link>`. No other values.
- **Last updated** is the date of the most recent meaningful edit.
  Keep it in sync with the top row of the change log.
- The change log lives **inside the doc**, not in a central file. One
  global `CHANGELOG.md` at the repo root tracks **product releases**;
  per-doc change logs track **doc deltas**. They are different things.
- Change-log rows are append-style, **newest at the top**, with
  absolute ISO dates (`YYYY-MM-DD`).
- The **Reason** column is required — what motivated the change, not
  just what changed. If the answer is "typo" or "rephrasing", the row
  is probably not worth recording.
- Use `—` in `Section` for whole-document edits.

### Table of Contents

Add a `## Table of Contents` immediately after the change log **only
if** the document has 5+ top-level sections or is longer than ~150
lines. Short docs do not need a TOC.

### Style rules

- Sentence case for headings.
- Imperative mood in runbooks and guides.
- ISO 8601 dates everywhere.
- Hard-wrap at ~80 columns.
- One blank line between sections.
- Code fences always tagged with the language.
- No emoji unless the user explicitly asked.

### Where the canonical template lives

`docs/_template.md` in this repo. The cross-project canonical template
lives in the `home` repo (`bitbybit-ar/home/docs/_template.md`); this
repo's copy is intentionally identical and should stay in sync.

## Code rules (enforced)

- **Payment surfaces are server-only.** Wapu API keys, NWC connection
  secrets, and webhook handlers live in API routes or server-only
  modules. Never expose them to the client. Use `NEXT_PUBLIC_*` only
  for non-secret display values.
- **Verify Wapu webhook signatures.** Every incoming webhook must be
  authenticated before any state change.
- **Settlement is Wapu-only in v1.** Do not introduce a settlement
  abstraction or a second rail. Decision pinned in ADR
  `docs/architecture/decisions/0002-settlement-via-wapu.md`.
- **Catalog is config-driven.** Offerings come from `merchant.yaml`
  (or equivalent), not from a database. No stock counts, no variants,
  no inventory. Decision in ADR
  `docs/architecture/decisions/0004-static-config-deployment.md`.
- **Auto-renewal is opt-in per merchant.** When the
  `features.autorenewal` flag is off, the NWC client, cron job, and
  encrypted-secrets storage stay unwired. Decision in ADR
  `docs/architecture/decisions/0005-prepaid-default-autorenewal-optin.md`.
- **No email integration.** Delivery is the in-app receipt page
  (`/[locale]/gracias/[orderId]`) plus optional Nostr DMs. Decision
  in ADR
  `docs/architecture/decisions/0006-nostr-and-inapp-delivery.md`.
- **Nostr signing keys are server-only.** The deployment's
  `NOSTR_NSEC` lives in env vars and is consumed by API routes or
  server-only modules. Never ship it to the client.
- **No buyer-side wallet detection.** Buyers came to a sats checkout
  to pay sats. The merchant's auto-renewal flag is the only real
  toggle; both checkout buttons are visible when it is on, and the
  buyer self-selects.
- Every user-facing string goes through next-intl. Add the key to
  **both** `messages/es.json` and `messages/en.json` in the same
  change.
- New colors/spacing/typography go into `styles/_theme.scss` as
  tokens. Never hardcode hex or px values.
- One `<h1>` per page.
- External links carry `target="_blank" rel="noopener noreferrer"`.
- All raster images go through `next/image`. `priority` only on hero
  images.
- Follow the existing component layout: `Foo/index.tsx` +
  `Foo/foo.module.scss`.

## When you make a change

1. Update the affected doc's `## Change Log` table.
2. Update `## Last updated` to today's date.
3. If the change is user-visible at the product level, also add a row
   in the **root** `CHANGELOG.md` under `## [Unreleased]`.
4. If the change is a significant architectural decision, also add an
   ADR under `docs/architecture/decisions/`. A decision is
   "significant" if changing it later would require touching multiple
   files, retraining the team, or coordinating a migration.

## Pointers

- Stack and routing: `docs/architecture/overview.md`.
- Mission and product positioning: `docs/about/mission.md`.
- Architecture decisions: `docs/architecture/decisions/`.
- Doc template: `docs/_template.md`.
- Project release log: root `CHANGELOG.md`.
- Sister project (org landing): `~/Documents/projects/bitbybit/home/`.
