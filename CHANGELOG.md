# Changelog

All notable **product** changes to BitByBit Cursá live here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

> **Note** — per-document edits live inside each doc's own
> `## Change Log` section (see `docs/_template.md`). This file is for
> product releases only.

## [Unreleased]

### Added

- ADR
  [0010-no-yaml-config](docs/architecture/decisions/0010-no-yaml-config.md):
  no YAML configuration file ships in the repo. Branding lives in
  `styles/_theme.scss`, copy in `messages/{es,en}.json`, merchant
  identity in `lib/merchant.ts`, secrets and `ADMIN_PUBKEYS` in
  env vars, offerings + CBU/alias + autorenewal in Postgres.
  Includes a migration map for every field that used to live in
  the planned `merchant.yaml`.
- ADR
  [0009-offerings-and-settings-in-database](docs/architecture/decisions/0009-offerings-and-settings-in-database.md):
  offerings move to a Postgres `offerings` table (drizzle), and
  runtime settings (CBU, alias, autorenewal toggle) become a
  singleton `settings` row. Vercel Blob for offering images. Soft
  delete via `archived_at`; no drafts, no scheduling, no
  inventory. Supersedes the catalog half of ADR 0004; the
  single-tenant deployment posture stands.
- ADR
  [0008-merchant-admin-dashboard](docs/architecture/decisions/0008-merchant-admin-dashboard.md):
  the merchant admin panel at `/[locale]/panel/...`. Auth via the
  Nostr session module (ADR 0007) gated by `ADMIN_PUBKEYS` env
  var; non-admins receive 404. Read-only over orders, payments,
  and buyers in v1 (filter, search, sort, paginate, CSV export
  remain). Full CRUD over offerings. Settings updates touching
  payment-destination fields (CBU, alias) require a NIP-07
  re-sign at save time. Every mutation writes to
  `admin_audit_log`. Routes inventory listed in the ADR and in
  `docs/architecture/routing.md`.
- `docs/architecture/routing.md`: the full route map (buyer
  flow, account, subscriber, static, panel, API, special files,
  conventions, and what is intentionally not routed). Replaces
  the inline routing snippet in `docs/architecture/overview.md`,
  which now points here.
- ADR
  [0007-optional-nostr-buyer-login](docs/architecture/decisions/0007-optional-nostr-buyer-login.md):
  optional Nostr login for buyers, never required. Three identity
  tiers — anonymous (opaque URL only), anonymous with npub or
  NIP-05 (URL plus DM, no session), and logged-in via Nostr (URL
  plus DM plus persistent `/[locale]/mis-compras` history). Auth
  module ported from bitbybit-arena (NIP-07, raw nsec, NIP-46
  Nostr Connect; `jose` JWT in an httpOnly cookie). Orders move
  from "opaque URL is the only key" to a Postgres row via
  `drizzle-orm`, with `pubkey` nullable so anonymous orders keep
  working unchanged. Settlement stays Wapu-only (ADR 0002).
- ADR
  [0006-nostr-and-inapp-delivery](docs/architecture/decisions/0006-nostr-and-inapp-delivery.md):
  the canonical delivery channel is an in-app receipt page at
  `/[locale]/gracias/[orderId]`; optional NIP-44 Nostr DMs push the
  same content for buyers who connected a pubkey at checkout
  (auto-renewal subscribers always receive DMs since NWC gives us
  their pubkey). No email integration.
- "A note on the name" section in `docs/about/mission.md`
  explaining the voseo origin of "Cursá" and the cursa-vs-Cursá
  surface convention.

### Changed

- ADR
  [0005-prepaid-default-autorenewal-optin](docs/architecture/decisions/0005-prepaid-default-autorenewal-optin.md)
  amended: the autorenewal flag moves from a build-time
  `merchant.yaml` field to a runtime panel toggle stored in
  `settings.features_autorenewal` (Postgres). The NWC client,
  cron handler, and encrypted-secrets storage are now *deployed
  but dormant* when the flag is off, gated by a runtime check —
  rather than the original "stay unwired" posture, which a
  runtime toggle cannot satisfy. Status updated to "Accepted
  (autorenewal flag amended by 0009)".
- `CLAUDE.md` code rules updated to match the new model: the
  "Catalog is config-driven" rule was replaced by "Catalog and
  runtime settings live in Postgres"; the autorenewal rule
  rewritten to reflect the runtime toggle and "deployed but
  dormant" posture; new rules added for "No `merchant.yaml`" and
  "The panel is admin-only"; pointers section gained
  `docs/architecture/routing.md` and the bitbybit-arena auth
  module reference.
- `docs/about/mission.md` reframed the merchant onboarding model
  from "edits a config file" to "developer forks once, merchant
  runs everything from the dashboard." The body paragraph was
  rewritten and the "Vertical depth" / "What we don't do"
  bullets cross-link to ADRs 0008–0010.
- `docs/architecture/overview.md` major rewrite: added Identity
  model and Merchant admin panel sections; Stack now lists
  Postgres + drizzle, Vercel Blob, and `jose`; Routing trimmed
  to a summary with a pointer to the new `routing.md`; the
  former "Merchant config" YAML example replaced by a
  Configuration model table mapping each layer to its editor
  and editing surface; Security expanded with panel auth, admin
  API namespace, audit log, and the per-mutation NIP-07 re-sign
  for payment-destination changes; "What is intentionally not
  here" updated to remove "no buyer accounts" and "no admin UI"
  and to add "no CMS for landing content" plus the read-only
  v1 carve-out.
- ADR 0006 extended to record a third DM trigger — logged-in
  Nostr sessions — alongside npub-at-checkout and NWC-derived
  pubkey for subscribers. Status updated to "Accepted (extended
  by 0007)".
- `docs/about/mission.md` softened "no buyer accounts or login"
  to "no *required* buyer accounts": anonymous purchase remains
  the floor, optional Nostr login is now in scope. The "Vertical
  depth" value was updated for the same distinction. Both edits
  cross-link to ADR 0007.
- Removed every email-delivery reference from `README.md`,
  `CLAUDE.md`, `CONTRIBUTING.md`, `.env.example`,
  `docs/about/mission.md`, `docs/architecture/overview.md`,
  ADR 0003, and ADR 0005. Replaced with in-app receipt + optional
  Nostr DM language consistent with ADR 0006. Dropped the
  `merchant.email` field from the example merchant config.
  `docs/architecture/overview.md` gained a dedicated
  "Notifications & delivery" section.

- Initial app scaffold mirroring `home`'s Next.js 16 structure:
  `package.json` (next, next-intl, next-themes, sass, ESLint,
  TypeScript), `next.config.ts` with the same security headers and
  CSP as `home`, `tsconfig.json`, `eslint.config.mjs`, `vercel.json`,
  `proxy.ts` (next-intl middleware), `i18n/{routing,request}.ts`,
  `messages/{es,en}.json`, `app/[locale]/{layout,page}.tsx`, and a
  placeholder "coming soon" page in es and en.
- `styles/` and `components/ui/` (button, card, container, section,
  toast) copied from `home` for visual and primitive parity. The
  toast pulled in `lib/utils.ts` (`cn` helper) and
  `components/icons/` as required dependencies.
- Theme provider via `lib/contexts/theme-context.tsx` (next-themes
  wrapper; light default, dark toggles `data-theme` on `<html>`).
- Fonts: `Nunito` (display) and `Nunito Sans` (body) loaded via
  `next/font/google` in the root layout and exposed as
  `--font-display` / `--font-body` CSS custom properties.
- SEO surface: per-locale `generateMetadata` (title, description,
  keywords, OG, Twitter, robots, canonical, hreflang alternates),
  `Organization` + `WebSite` JSON-LD with `parentOrganization`
  pointing at BitByBit, dynamic OG image at
  `app/[locale]/opengraph-image.tsx`, `app/sitemap.ts`,
  `app/robots.ts`, `app/manifest.ts`, and a placeholder
  `public/icons/icon.svg` (BitByBit family logo, to be replaced with
  Cursá's own brand mark).
- Initial documentation tree mirroring the canonical structure in
  the `home` repo: `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`,
  `docs/_template.md`, `docs/README.md`, `docs/about/mission.md`,
  `docs/architecture/overview.md`, and the first five ADRs
  (record-architecture-decisions, settlement-via-wapu,
  educator-vertical, static-config-deployment, prepaid-default-
  autorenewal-optin).
