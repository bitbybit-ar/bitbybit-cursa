# Changelog

All notable **product** changes to BitByBit Cursá live here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

> **Note** — per-document edits live inside each doc's own
> `## Change Log` section (see `docs/_template.md`). This file is for
> product releases only.

## [Unreleased]

### Added

- NIP-46 (Nostr Connect / "bunker") signer method on the sign-in
  page. Buyers with a remote signer (nsec.app, Amber, …) can now
  pair via QR scan (we generate a `nostrconnect://` URI) or by
  pasting a `bunker://` URL their signer produced. New
  `lib/nostr/nip46-login.ts` ports the arena reference: persistent
  client-key in localStorage so re-mounting the panel does not
  rotate identity, abort-signal-aware
  `BunkerSigner.fromURI`, and an `auth_url` callback for signers
  that need an extra approval click. New
  `<NostrConnectPanel>` component renders the QR + paste
  fallback + auth-url banner + slow-hint + expired/retry states.
  `makeNip46Signer` added to `lib/nostr/signers.ts` (it
  delegates `signEvent` to the live BunkerSigner and exposes
  `close()` so the SignerProvider can tear down the relay
  connection on sign-out). `<SignerMethodButtons>` now renders
  all three methods by default (extension, NIP-46, nsec) with
  the picker UI. New `login.connect*` keys in both
  `messages/es.json` and `messages/en.json`. The
  `BunkerLoginError` class carries a stable `bunker_invalid_url`
  code for the localised invalid-paste path. No new tests —
  this is glue around `nostr-tools/nip46`'s already-tested
  primitives plus UI orchestration; relay-handshake testing is
  out of scope for unit/integration suites.
- "Create a new identity" flow on the sign-in page. New
  `lib/nostr/create-account.ts:createNewIdentity` generates a
  fresh secp256k1 keypair via nostr-tools, encodes it to nsec
  bech32, and returns `{ secretKey, pubkey, nsec }`. The sign-in
  page renders a divider + secondary CTA below the signer-method
  picker; clicking it opens a modal that shows the freshly-
  generated nsec, lets the buyer copy it, and requires a
  "saved my key" checkbox before proceeding. Internal state
  machine (`idle` / `auth_failed` / `ready`) matches the arena
  reference: the nsec is pinned on screen BEFORE the auth
  round-trip so a network blip mid-call never strips the user
  of their only copy of the key, and the retry CTA reuses the
  same already-generated signer rather than spawning a fresh
  identity. Four new unit tests in
  `tests/unit/lib/nostr/create-account.test.ts` cover key
  shape, nsec round-trip, schnorr-pubkey derivation, and
  per-call freshness. New i18n keys under `login` in both locale
  files.
- `/api/downloads/[orderId]` proxy route for `type=download`
  offerings. The receipt page's download CTA now points here
  instead of the raw `offering.download_url`, keeping the source
  URL out of the public DOM. The proxy validates that the order
  exists, is `paid`, and that the offering is download-type, not
  archived, and has a URL on file, then 302-redirects to the
  source. Status matrix: 400 (invalid uuid), 403 (not paid), 404
  (missing / wrong type / archived / no URL), 302 (redirect).
  The orderId in the URL stays the access key per ADR 0006 (no
  session required — anonymous buyers must redeem from any
  device). `<ReceiptDownload>` now takes
  `{ orderId, isAvailable }` instead of the raw download URL.
  Seven new integration tests in
  `tests/integration/api/downloads.test.ts` cover the full
  status matrix. Future hardening (per-order expiry, single-use
  semantics) noted inline in the route comment.
- Wapu webhook now draws a redemption code from
  `offerings.code_pool` and assigns it to `orders.redemption_code`
  on the same delivery that flips the order to `paid`. New
  `lib/orders.ts:drawAndAssignCode` helper handles concurrency
  via optimistic-concurrency retry (neon-http does not support
  interactive transactions): the UPDATE on offerings matches the
  candidate's exact pool position, so a racing webhook that
  picked the same code sees zero rows updated and retries with
  the shrunken pool. Idempotent on repeat delivery
  (`already_assigned` short-circuit). Five new integration tests
  in `tests/integration/lib/orders.test.ts` cover assigned,
  idempotent, pool_empty, not_a_code_offering, and a parallel
  race smoke test. Closes the receipt-page "código pendiente"
  gap that was deferred from chunk 4.
- `/[locale]/mis-compras` — order history for the logged-in
  buyer. Server-rendered list of `listOrdersByPubkey(session.
  pubkey)` results, each row linking back to
  `/[locale]/gracias/[orderId]`. Includes a sign-out button
  (new `<SignOutButton>` client component). Empty state links
  back to the catalog. Bounces anonymous visitors to
  `/iniciar-sesion?next=/mis-compras`.
- `/[locale]/reclamar/[orderId]` — claim an anonymous order for
  the current buyer's pubkey. Server-rendered, validates the
  orderId UUID, and bounces anonymous visitors through sign-in.
  Already-yours orders go straight to the receipt; orders held
  by a different pubkey render a dedicated conflict state. The
  claim CTA itself is a small client component that POSTs to
  the new claim endpoint.
- `/api/orders/[orderId]/claim` — POST endpoint that attaches an
  anonymous order to the current session's pubkey. Returns 401
  (no session), 400 (invalid uuid), 404 (no order), 409 (already
  claimed by a different pubkey), or 200 with
  `{ status: "claimed" | "already_yours", order_id }`. The
  session pubkey always wins; we never trust a pubkey from the
  request body.
- `lib/orders.ts:claimOrderForBuyer` helper — discriminated
  result (`claimed` / `already_yours` / `already_claimed` /
  `not_found`). Idempotent on `already_yours` so a buyer who
  clicks twice gets a benign success rather than a confusing
  conflict. Covered by four new integration tests in
  `tests/integration/lib/orders.test.ts`.
- i18n: new `account`, `orderStatus`, and `claim` namespaces in
  both `messages/es.json` and `messages/en.json`.
- Sign-in page at `/[locale]/iniciar-sesion`. Buyers can connect a
  Nostr identity via NIP-07 browser extension (Alby, nos2x) or by
  pasting an nsec; NIP-46 (Nostr Connect) is intentionally
  deferred. Honors a `?next=...` query param so the
  Nostr-prompt-card on `/[locale]/gracias/[orderId]` can bounce
  buyers through sign-in straight to `/reclamar/[orderId]`. Path
  whitelist (`/mis-compras`, `/reclamar/`, `/gracias/`) prevents
  open-redirect on the `next` param.
- `Modal` UI primitive (`components/ui/modal/`) — accessible
  dialog with click-outside / Escape close, focus trap, and
  return-focus on close. Used by the nsec sub-panel on the
  sign-in page.
- Auth UI components ported from arena (kebab-case naming):
  `extension-signer-button` (NIP-07 button with inline
  no-extension help text — replaces the arena Tooltip dep),
  `nsec-signer-form` (paste + show/hide + accept-risk + parse
  via nostr-tools nip19/pure), and `signer-method-buttons`
  (picker that today renders extension + nsec).
- `lib/hooks/useClickOutside.ts` — used by Modal.
- i18n: new `common`, `login`, `reSignIn` namespaces in both
  `messages/es.json` and `messages/en.json`.
- Nostr signer infrastructure ported from `bitbybit-arena`:
  `lib/nostr/signers.ts` (extension + nsec; NIP-46 deferred),
  `lib/nostr/auth-errors.ts` (discriminated `AuthError` for
  cross-namespace localisation), and a slim
  `lib/contexts/signer-context.tsx` that owns session fetch +
  in-memory signer + the NIP-98 login round-trip + sign-out.
  Wired as `<SignerProvider>` inside `app/[locale]/layout.tsx`.
  Auto-restores the extension signer on reload when the session
  cookie matches the extension's pubkey. The arena reference
  splits this into Session/Signer/ReSignIn — Cursá's buyer flow
  only signs at login, so the slimmed combined version covers
  v1; pull in the arena machinery if a future feature signs
  beyond auth.
- Buyer critical-path UI: catalog at `/[locale]`, offering detail
  at `/[locale]/c/[slug]`, Lightning checkout at
  `/[locale]/checkout/[orderId]` (BOLT11 QR + copy + 3-second
  status poll against `/api/orders/[orderId]`), and the permanent
  receipt at `/[locale]/gracias/[orderId]` (redemption code or
  download CTA, plus a Nostr-prompt card for anonymous orders).
  Reuses `Button`, `Card`, `Section`, `Container`, `Toast`, and
  the existing icon set; adds `qrcode.react` for the BOLT11 QR.
  Anonymous-only checkout in this chunk; the optional
  npub-paste-at-checkout (ADR 0007 tier 2), sign-in,
  `/mis-compras`, and `/reclamar` are deferred to a later chunk.
  i18n: new `catalog`, `offering`, `checkout`, `receipt`,
  `pricing`, `errors` namespaces in both `messages/es.json` and
  `messages/en.json`. Routing doc renamed `[invoiceId]` to
  `[orderId]` (the polling API and the receipt URL already used
  the order id; using one name across all three surfaces).
- `lib/offerings.ts` data-layer reads — `listActiveOfferings`,
  `getOfferingBySlug`, `getOfferingById`. Used by the catalog,
  offering detail, checkout, and receipt pages to pull rows from
  Postgres. Mirrors the shape of `lib/orders.ts` and reuses
  `getDb()` from `lib/db/index.ts`.
- `orders.bolt11` column (drizzle migration 0001) so the
  checkout page can re-render the QR after a reload without
  re-calling Wapu. Populated by `createOrder` at invoice time;
  the public `WapuInvoiceState` shape does not surface BOLT11,
  so persisting it on the row is the only way to recover it.
- `scripts/seed-offerings.ts` — seeds three sample offerings
  (two `code`, one `download`) via `npm run db:seed`.
  Idempotent (`ON CONFLICT (slug) DO NOTHING`) and shares the
  dotenv precedence pattern with `scripts/migrate.ts`.
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

- Brand palette swapped from slate-gray + gold to blue
  (`#3B82F6` primary) + lime (`#A5CE3A` secondary), with four
  decorative accent tokens (pink, orange, cyan, gold). The old
  brand gold survives as `accent-gold` for decorative use.
  `styles/_theme.scss` flattened: every value lives in `:root`
  and `[data-theme="dark"]` only declares the diffs. Brand and
  gray scales (`primary-N`, `secondary-N`, `gray-N`) trimmed to
  five steps each (100/300/500/700/900) and reversed in dark
  mode so role tokens like `--color-primary-hover` and
  `--focus-ring` auto-flip via a single `var()` reference.
  `Button.variant-{accent,secondary}` switched from `$gray-900`
  to `$static-navy` for label text — the gray scale flips in
  dark mode, which would have regressed contrast on the lime
  CTA otherwise.
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
