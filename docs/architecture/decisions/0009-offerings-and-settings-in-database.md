# 0009. Offerings and merchant settings live in Postgres, not config

- **Date**: 2026-05-06
- **Status**: Accepted (supersedes ADR [0004](0004-static-config-deployment.md) for the catalog and runtime settings)
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-06

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-06 | — | Initial version. | Pin the storage model for offerings and runtime settings before any panel CRUD code is written, and explicitly record what ADR 0004 still owns versus what moves out. |

---

## Context

ADR [0004](0004-static-config-deployment.md) put the entire
merchant catalog in a YAML file (`merchant.yaml`) shipped in the
repo. The deployer would fork, edit, push, and Vercel would
redeploy. That model assumed the deployer and the merchant were
the same person (or in close contact) and that catalog changes
were rare enough to justify a 30–90 second redeploy each time.

ADR [0008](0008-merchant-admin-dashboard.md) breaks both
assumptions. The merchant is now a non-technical educator with no
access to the repo, who needs to add a course at 10pm without
calling a developer. ADR [0007](0007-optional-nostr-buyer-login.md)
already brought Postgres into the deployment for orders and
sessions, so adding two more tables incurs no new infrastructure.

There is also a concrete operational pressure: the merchant's
**CBU/alias** is a payment destination that may change (bank
switch, account closure). Forcing a redeploy to update a bank
account is brutal merchant UX.

The catalog and runtime settings therefore move to the database.
Branding, copy, identity, and feature gating *that requires code
changes* stay in the repo, where they are still edited by the
developer who forks. ADR [0010](0010-no-yaml-config.md) records
the broader implication: there is nothing left in `merchant.yaml`
worth keeping, so it is removed.

## Decision

Two new Postgres tables (via `drizzle-orm`, matching the stack
chosen in ADR 0007).

### `offerings` table

```text
offerings
  id            uuid primary key
  slug          text unique not null      -- URL slug, panel-editable
  type          enum('code','download') not null
  title         text not null             -- es; en handled separately if needed
  description   text not null
  price_ars     integer not null          -- minor unit (cents) or whole pesos: TBD at impl
  price_sats    integer nullable          -- if pinned; else computed from ARS at quote time
  image_url     text nullable             -- Vercel Blob URL
  code_pool     text[] nullable           -- for type=code
  download_url  text nullable             -- for type=download (signed at delivery time)
  archived_at   timestamptz nullable      -- soft delete
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()
```

- `slug` is unique. The panel form errors on collision; no auto-
  suffixing — the merchant should pick deliberately.
- `archived_at` is the soft-delete mechanism. Hard delete is not
  exposed in v1 because past `orders` rows reference offerings
  and we do not want orphaned references.
- No drafts, no scheduling, no inventory. Out of v1 scope.
- No multi-language fields in v1 — the panel writes Spanish; the
  English copy is identical at render time. A `translations`
  side-table is the obvious v1.1 evolution.

### `settings` table (singleton row)

```text
settings
  id                      smallint primary key check (id = 1)
  cbu                     text nullable
  alias                   text nullable
  features_autorenewal    boolean not null default false
  updated_at              timestamptz not null default now()
  updated_by              text nullable      -- pubkey of last admin
```

- One row, ever. The `id = 1` check enforces that.
- Either `cbu` or `alias` is required for the merchant to take
  payouts; the panel form validates this. The schema allows both
  to be null so the very first deploy can render `/panel` before
  the merchant has filled anything in.
- `features_autorenewal` becomes a runtime toggle (see amended
  ADR [0005](0005-prepaid-default-autorenewal-optin.md)) — the
  autorenewal code paths are deployed but dormant when this is
  false.
- Updates to `cbu` / `alias` require a NIP-07 re-sign at save
  time (defined in ADR 0008). The schema is agnostic; the
  enforcement lives in `/api/admin/settings`.

### `admin_audit_log` table

Defined in ADR 0008. Mentioned here so the schema overview is
complete: every mutation through the panel writes a row.

### Image storage

Offering images are uploaded to **Vercel Blob** from the panel.
The blob URL is what `image_url` stores. Rationale: zero
additional vendor relationship for a Vercel-deployed app, signed
URLs out of the box, simple cleanup story when an offering is
hard-deleted in a future version. Public reads (catalog images
are not sensitive); private buckets reserved for the v1.1
`download` asset upload flow.

### What ADR 0004 still owns

ADR 0004 is **not** fully superseded. It still owns the
single-tenant deployment posture: one repo fork = one merchant.
The dashboard does not introduce multi-tenancy; the database is
per-deployment and has exactly one settings row.

## Consequences

### Positive

- The merchant can add or edit a course in seconds, no redeploy.
- CBU/alias changes apply immediately and survive redeploys.
- Soft-delete via `archived_at` keeps order history intact.
- Vercel Blob removes the "where do uploaded images live"
  question without adding a vendor dependency.
- Catalog rendering becomes a simple `select * from offerings
  where archived_at is null` — every page that lists offerings
  uses the same query.

### Negative

- Empty-state UX matters now. A fresh deploy has zero offerings
  and a null CBU. The first-run experience for the merchant is
  literally "log into `/panel`, set CBU, add your first course."
  That has to be designed, not assumed.
- The repo is no longer fully self-describing. To understand
  what a deployment sells, you have to query the DB rather than
  read the repo.
- DB migrations become a release-coordination concern. Drizzle's
  generated SQL is reviewable, but every offering-shape change
  is now a migration rather than a YAML edit.
- A buggy panel mutation can corrupt offerings live. Mitigations:
  CSV export of offerings (planned, not in v1), audit log,
  soft-delete only.

### Neutral

- A future `translations` table for English copy is an obvious
  v1.1 add. Schema would key on `(offering_id, locale)`. Not
  needed for the hackathon — the demo is Spanish-default.
- A future per-offering `inventory` field could be added without
  schema gymnastics if a merchant cohort actually needs stock
  counts. Out of scope.

## Alternatives considered

- **Keep `merchant.yaml` as the source of truth and have the
  panel commit changes via the GitHub API.** Rejected in the
  prior conversation: 30–90s redeploy on every save is
  unacceptable merchant UX, plus it requires GitHub OAuth wiring
  per deployment.
- **Hybrid: YAML as seed, DB overrides at runtime.** Rejected:
  two sources of truth always drift. Better to have one.
- **Drop offerings entirely, generate them from Wapu.** Rejected:
  Wapu is a payments rail, not a product catalog. There is no
  Wapu primitive that maps to "Bono 4 clases."
- **SQLite instead of Postgres.** Rejected: Vercel's serverless
  runtime makes file-backed SQLite painful (cold writes,
  ephemeral filesystem). Postgres on Vercel is the path of least
  surprise and matches arena.
- **Store images as base64 in the DB.** Rejected: balloons row
  size, balloons backup size, and forces every catalog query to
  drag bytes it does not need.

## References

- ADR [0004](0004-static-config-deployment.md) — partially
  superseded by this ADR for the catalog and runtime settings;
  still authoritative for the single-tenant deployment posture.
- ADR [0005](0005-prepaid-default-autorenewal-optin.md) — amended
  in the same change pass; autorenewal flag now lives in
  `settings.features_autorenewal`.
- ADR [0007](0007-optional-nostr-buyer-login.md) — chose Postgres
  + drizzle; this ADR builds on that choice.
- ADR [0008](0008-merchant-admin-dashboard.md) — the surface that
  reads and writes these tables.
- ADR [0010](0010-no-yaml-config.md) — `merchant.yaml` removed
  because nothing meaningful is left in it.
