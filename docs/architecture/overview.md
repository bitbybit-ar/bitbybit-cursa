# Architecture overview

> **Status:** Active
> **Last updated:** 2026-05-07

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-07 | Stack | Replaced the dead `docs.wapu.app/api-docs/en` reference in the Wapu line with: (a) the actual API base URLs for production and staging, and (b) a pointer to the wapu-cli repo as the public source of the API contract until Wapu publishes formal docs. | The original URL 404s; the wapu-cli repo (github.com/wapu-app/wapu-cli) is currently the only public source of the API contract, and Wapu runs a staging environment at staging.wapu.app for fake-money testing. Future contributors should not waste time on the broken URL. |
| 2026-05-06 | What this app is, Stack, Routing, Auto-renewal flow, Notifications & delivery, Merchant config, Security, What is intentionally not here, Table of Contents | Replaced the Routing section with a short pointer to `routing.md` (full route map now lives there). Rewrote the Merchant config section: `merchant.yaml` is removed; offerings + CBU/alias + autorenewal flag now live in Postgres and are edited from `/panel`; branding/copy/identity stay in code; `ADMIN_PUBKEYS` lives in env. Updated the auto-renewal flow paragraph: flag is a runtime panel toggle, code is dormant when off. Added Postgres + drizzle and Vercel Blob to the Stack list. Added the panel surface and admin-only API namespace to Security. Removed "no buyer accounts" and "no admin UI" from "What is intentionally not here" (they exist now per ADRs 0007 and 0008). Updated TOC. | ADRs 0007–0010 introduced Postgres, optional Nostr login, the merchant admin panel, offerings + settings in DB, and removed `merchant.yaml`. The overview was the most code-shaped doc in the repo and was lying about all of these. |
| 2026-05-06 | Notifications & delivery, Payment flow, Auto-renewal flow, Security, Merchant config, What is intentionally not here, Table of Contents | Added the Notifications & delivery section. Removed email from the payment flow diagram, the auto-renewal flow diagram, the security section, the merchant config (`merchant.email` field dropped), and the intentionally-not-here list (added "no email"). Updated TOC. | The decision in ADR 0006 makes the delivery channel in-app receipt + optional Nostr DM. The overview was still describing an email-based model that no longer matches the architecture. |
| 2026-05-06 | SEO surface, Theming, Table of Contents | Added the SEO surface section (per-locale metadata, Organization + WebSite JSON-LD, dynamic OG image, sitemap, robots, manifest) and the Theming section (next-themes wrapper, copied token system, Nunito + Nunito Sans via next/font). Documented the new `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/[locale]/opengraph-image.tsx`, `lib/contexts/theme-context.tsx`, `lib/env.ts`, `lib/seo.ts`. | The initial scaffold landed those pieces; the overview must reflect what the code actually does so contributors don't have to reverse-engineer it. |
| 2026-05-05 | — | Initial version. | Document the v0 architecture before any code lands so the scaffold has a reference shape to follow. |

---

## Table of Contents

1. [What this app is](#what-this-app-is)
2. [Stack](#stack)
3. [Routing](#routing)
4. [Identity model](#identity-model)
5. [Merchant admin panel](#merchant-admin-panel)
6. [SEO surface](#seo-surface)
7. [Theming](#theming)
8. [Product primitives](#product-primitives)
9. [Payment flow](#payment-flow)
10. [Auto-renewal flow (optional)](#auto-renewal-flow-optional)
11. [Notifications & delivery](#notifications--delivery)
12. [Configuration model](#configuration-model)
13. [Security](#security)
14. [What is intentionally not here](#what-is-intentionally-not-here)

---

## What this app is

Cursá is a Next.js storefront app deployed once per merchant. Each
deployment serves one educator: their catalog, their branding,
their checkout, their CBU. The repo is intended to be forked or
templated.

A developer forks the repo, sets the brand and copy, and deploys
it. From then on, the merchant runs everything — offerings,
payments, settings, students — from a dashboard at
`/[locale]/panel`. No more file edits.

A buyer visits `cursa.bitbybit.com.ar` (the demo) or
`tienda.<merchant-domain>` (a forked deployment), browses
offerings, clicks one, gets a Lightning invoice, pays it, and
lands on a permanent receipt page that shows their redemption code
or download link. If they connected a Nostr identity at checkout
(or signed in with one), an encrypted DM with the same content
lands in their Nostr client. Buyers may optionally sign in with
Nostr to see their full order history at `/[locale]/mis-compras`;
purchase never requires it.

Wapu sits between the Lightning invoice and the merchant's bank.
It accepts the sats, converts to ARS at market rate, and pushes
pesos to the merchant's CBU or alias.

## Stack

- **Next.js 16** (App Router) — server-rendered for any route
  that touches Postgres or secrets; static where possible.
- **next-intl** — Spanish (default) and English; locale routed via
  `app/[locale]/...`.
- **next-themes** — Light/dark mode.
- **SCSS modules** — per-component styles. Tokens in
  `styles/_theme.scss`.
- **Postgres + drizzle-orm** — orders, sessions, offerings,
  settings, audit log. Stack matches bitbybit-arena. Schema and
  rationale in ADR
  [0009](decisions/0009-offerings-and-settings-in-database.md).
- **Vercel Blob** — image storage for offerings, written via
  `/api/admin/upload`.
- **Wapu API** — Lightning invoice creation, ARS withdrawal,
  payment status. Production base
  `https://be-prod.wapu.app`; staging base
  `https://staging.wapu.app` (fake-money testing). Auth header is
  `X-API-Key`. The public source of the API contract is
  <https://github.com/wapu-app/wapu-cli> until Wapu publishes
  formal docs; the relevant endpoints are `POST
  /wallet/deposit_lightning` (Lightning invoice), `GET
  /transactions/{id}` (status), and `POST /transactions/create`
  (ARS withdrawal as a `fiat_transfer`).
- **Nostr** — server-side signing for outgoing DMs (`nostr-tools`
  + `@noble/secp256k1`); NIP-07 / nsec / NIP-46 client-side for
  buyer identity at checkout, buyer login (ADR
  [0007](decisions/0007-optional-nostr-buyer-login.md)), and
  admin login + per-mutation re-sign on the panel (ADR
  [0008](decisions/0008-merchant-admin-dashboard.md)).
- **`jose`** — signs the session JWT held in an httpOnly cookie.
- **Vercel** — Hobby plan plus Vercel Cron when auto-renewal is on.

## Routing

The full route map — buyer flow, account, subscriber,
static, panel, API — lives in
[`routing.md`](routing.md). A short summary:

```text
/                                → 307 redirect to /es
/[locale]                        → landing + catalog
/[locale]/c/[slug]               → offering detail + buy button
/[locale]/checkout/[orderId]     → invoice + QR + status poll
/[locale]/gracias/[orderId]      → permanent receipt page

/[locale]/iniciar-sesion         → Nostr sign-in (optional)
/[locale]/mis-compras            → buyer order history (logged in)

/[locale]/panel/...              → merchant admin (gated by
                                    ADMIN_PUBKEYS env)

/api/wapu/webhook                → Wapu payment events
/api/auth/*                      → Nostr session
/api/admin/*                     → admin-scoped CRUD
/api/cron/renew                  → daily renewal pulls (when
                                    features_autorenewal is on)
```

See [`routing.md`](routing.md) for the rest, conventions, and
the rationale for each slug.

## Identity model

Three buyer identity tiers (ADR
[0007](decisions/0007-optional-nostr-buyer-login.md)):

1. **Anonymous.** Pay, land on `/gracias/[orderId]`, get the
   code, walk away. The opaque URL is the only access key.
2. **Anonymous with Nostr identifier.** Buyer pastes an
   `npub1...` or NIP-05 (`name@domain.com`) at checkout; the
   server resolves NIP-05 via `/api/nip05/resolve` and sends an
   encrypted DM with the receipt URL. No session.
3. **Logged-in via Nostr.** NIP-07 / nsec / NIP-46 sign-in
   issues a `jose` JWT in an httpOnly cookie. Orders link to the
   session pubkey; `/[locale]/mis-compras` lists them; DMs are
   automatic.

Auto-renewal subscribers get tier 3 implicitly — the NWC
connection already exposes their pubkey.

Admins are a separate concept layered on top of tier 3: a
session pubkey listed in the `ADMIN_PUBKEYS` env var unlocks the
panel. See [Merchant admin panel](#merchant-admin-panel).

## Merchant admin panel

`/[locale]/panel/*` is the merchant's surface for managing the
business. Decision pinned in ADR
[0008](decisions/0008-merchant-admin-dashboard.md).

- **Auth.** Nostr session (same module as buyer login); the
  pubkey must be present in `ADMIN_PUBKEYS` (env, comma-
  separated). Non-admins receive 404, not 403 — the surface is
  not advertised.
- **Read-only in v1**: orders, payments, buyers. Filter, search,
  sort, paginate, CSV export are all read-side and available.
  Refunds, resends, and DM-from-the-UI are deferred to v1.1.
- **Write in v1**: offerings (full CRUD), settings (CBU, alias,
  autorenewal toggle). Mutations to payment-destination fields
  (CBU, alias) require a NIP-07 re-sign at save time, so a
  stolen session cookie cannot quietly redirect future
  settlement.
- **Audit log.** Every mutation writes a row to
  `admin_audit_log`. The settings page surfaces recent entries.

Routes inventory and request shapes live in
[`routing.md`](routing.md).

## SEO surface

- Per-locale `generateMetadata` in `app/[locale]/layout.tsx`
  produces title, description, keywords, OG, Twitter, robots,
  canonical, and `hreflang` alternates. The canonical and
  alternates use the helper at `lib/seo.ts`.
- `Organization` and `WebSite` JSON-LD are injected in the
  `<head>` from the layout. The `Organization` block sets
  `parentOrganization` to BitByBit so search engines associate
  Cursá with the wider org.
- Dynamic OG image rendered per locale via `next/og` at
  `app/[locale]/opengraph-image.tsx`. Headline and tagline come
  from `messages/{locale}.json` (`metadata.ogHeadline`,
  `metadata.ogTagline`).
- `app/sitemap.ts` lists `/es` and `/en` with hreflang alternates.
- `app/robots.ts` allows everything except `/api/` and `/_next/`.
- `app/manifest.ts` declares the standalone PWA shell with
  Cursá's name, short name, theme color (yellow), and icon.
- `lib/env.ts` centralises the `NEXT_PUBLIC_BASE_URL` lookup —
  every SEO surface uses it via `getBaseUrl()` and throws at boot
  if the env var is missing.
- The placeholder favicon at `public/icons/icon.svg` is the
  BitByBit family logo. Replace it with Cursá's own mark when
  brand work lands.

## Theming

- `next-themes` is wired through the wrapper at
  `lib/contexts/theme-context.tsx`, the same wrapper used by the
  `home` repo. Light is the default; dark toggles by setting
  `data-theme="dark"` on `<html>`. The `useTheme()` re-export
  adds a `toggleTheme()` shortcut and exposes a `ThemePreference`
  type.
- Token system copied from `home`: `styles/_theme.scss` defines
  atomic gray and yellow scales, semantic role tokens
  (`--color-primary`, `--color-secondary`, `--focus-ring`), and
  decorative tokens kept identical to arena so cross-project
  components (Button, Card, Container, Section, Toast) render
  consistently.
- Fonts: `Nunito` (display) and `Nunito Sans` (body) loaded via
  `next/font/google` in the root layout, exposed as
  `--font-display` and `--font-body` CSS custom properties
  consumed by `styles/_typography.scss`. The variants used today
  are `700`/`800` for display and `400`/`500`/`600` for body —
  add weights here when a component needs them. Falls back to
  `Nunito` / `Nunito Sans` system installs and then the platform
  default if the Google Fonts CDN is unreachable.

## Product primitives

Every offering in the merchant catalog is one of two types:

1. **`code`** — buyer pays, the receipt page shows a redemption
   code (and an optional Nostr DM mirrors the same content). The
   buyer shows the code to the merchant in person. Used for
   single classes, lesson packs, monthly bonos.
2. **`download`** — buyer pays, the receipt page shows a
   short-lived signed URL pointing at a private file. Used for
   PDF method books, sheet music, recorded course material.

Both share: catalog → Wapu invoice → webhook → receipt page (and
optional Nostr DM). The receipt content is the only difference.
See [Notifications & delivery](#notifications--delivery) for the
delivery model in detail.

## Payment flow

```text
Buyer              Cursá app             Wapu              Merchant bank
  │                    │                   │                     │
  │── click "Comprar" ▶│                   │                     │
  │                    │── create invoice ▶│                     │
  │                    │◀── invoice ───────│                     │
  │◀── show QR + amt ──│                   │                     │
  │── pay invoice (LN) ────────────────────▶                     │
  │                    │◀── webhook: paid ─│                     │
  │◀── receipt + code ─│                   │                     │
  │                    │── (opt) Nostr DM ─────────────────────  │
  │                    │                   │── ARS payout ──────▶│
```

The webhook handler is the source of truth for "payment confirmed."
Polling the checkout page is a UX nicety, not the trigger. Once
confirmed, the buyer is redirected to their permanent receipt page
at `/[locale]/gracias/[orderId]`; if they connected a Nostr
identity at checkout, an encrypted DM with the same content goes
out from the deployment's npub.

## Auto-renewal flow (optional)

Gated by `settings.features_autorenewal` (Postgres), toggled by
the merchant from `/[locale]/panel/configuracion`. The NWC
client, the cron handler, and the encrypted-secrets storage are
*deployed but dormant* when the flag is off — the code is
present in every build, gated by a runtime check on the flag.
Flipping the toggle takes effect immediately; no redeploy.
Decision in ADR
[0005](decisions/0005-prepaid-default-autorenewal-optin.md)
(amended by ADR 0009).

```text
Cron (daily)     Cursá app           NWC connection         Wapu
     │                │                     │                  │
     │── tick ───────▶│                     │                  │
     │                │── list expiring ────│                  │
     │                │── create invoice ───────────────────── ▶
     │                │◀── invoice ─────────────────────────── │
     │                │── pay via NWC pull ▶                   │
     │                │                     │── pay invoice ─ ▶│
     │                │◀── webhook: paid ────────────────────── │
     │                │── send "renewed" Nostr DM ────────────
```

Each subscriber stores: their NWC connection string (encrypted at
rest), the offering they subscribed to, the budget granted, and
the next renewal date. Renewal confirmations and cancellations
are pushed to the subscriber's Nostr pubkey — already known from
the NWC connection — so no separate identity prompt is needed. A
pull failure puts the subscription in a grace window; after N
retries the subscription is cancelled and a Nostr DM is sent.

There is no buyer-side wallet detection. Both checkout buttons
("Comprar" and "Autorenovar") are visible when the merchant's
flag is on; if a buyer's wallet cannot complete the NWC
connection, the auto-renewal flow simply fails and the buyer
falls back to the one-shot button.

## Notifications & delivery

Cursá does not integrate with email. Two channels deliver content
and notifications: an **in-app receipt page** and **optional
Nostr DMs**. Decision pinned in ADR
[0006-nostr-and-inapp-delivery](decisions/0006-nostr-and-inapp-delivery.md).

### In-app receipt page

Every paid order has a permanent receipt page at
`/[locale]/gracias/[orderId]` where `orderId` is an opaque,
unguessable identifier. It renders the redemption code (for
`code` offerings) or a short-lived signed download URL (for
`download` offerings) plus the order summary.

The receipt page is the **always-available** delivery channel —
it does not depend on the buyer providing any identity. Buyers
save the URL or screenshot the code.

### Optional Nostr push

A buyer who connects a Nostr identity at checkout (NIP-07 browser
extension or pasted npub) receives a NIP-44-encrypted DM with the
receipt URL right after the webhook confirms payment.

**Auto-renewal subscribers** always receive Nostr DMs for renewal
confirmations and cancellations: their pubkey is already known
from the NWC connection. No separate identity prompt.

### Non-Nostr buyers

Pre-paid buyers who do not connect Nostr have no push channel.
They keep the receipt URL they were shown at checkout. For
expiring lesson packs, the storefront UI can show "Renová tu
bono" CTAs to bring them back.

### Cursá's signing identity

The deployment uses a server-side Nostr key (env: `NOSTR_NSEC`)
to sign and encrypt outgoing DMs. The key never reaches the
client. A new key just means a new npub for outgoing DMs;
buyers read by their own pubkey, not by Cursá's identity, so
key rotation is bounded.

## Configuration model

There is no YAML configuration file. Each piece of state has
exactly one editor and exactly one editing surface. Decision in
ADR [0010](decisions/0010-no-yaml-config.md), with the storage
shape in ADR [0009](decisions/0009-offerings-and-settings-in-database.md).

| Layer | Edited by | Lives in |
|---|---|---|
| Branding tokens | the developer who forks | `styles/_theme.scss` |
| Page copy, FAQ, terms | the developer who forks | `messages/{es,en}.json` |
| Merchant identity, social links | the developer who forks | `lib/merchant.ts` |
| Secrets (Wapu key, NSEC, DB URL) | the deployer | env vars |
| Admin authorisation | the deployer | env var `ADMIN_PUBKEYS` (comma-separated) |
| Offerings (catalog) | the merchant | Postgres `offerings`, panel `/ofertas` |
| CBU, alias, autorenewal toggle | the merchant | Postgres `settings`, panel `/configuracion` |
| Orders, sessions, students | nobody | Postgres, system-managed |

First-run experience: deploy with empty DB → log into `/panel`
(as a pubkey listed in `ADMIN_PUBKEYS`) → set CBU/alias and add
the first offering. Buyers cannot complete a purchase until
CBU/alias is filled; the panel shows a "complete setup" banner
to nudge.

## Security

- HTTPS via Vercel, HSTS preload set.
- Wapu API key, NWC encryption key, the deployment's Nostr
  signing key (`NOSTR_NSEC`), the session JWT signing key, the
  Postgres connection string, and the `ADMIN_PUBKEYS` list all
  live in Vercel environment variables. Never reach the client.
- Wapu webhook signature is verified before any state mutation.
- NWC connection strings are encrypted at rest with a
  per-deployment key. Loss of that key means subscriptions are
  unrecoverable; that is the intended trade-off versus running
  our own KMS.
- Signed download URLs expire after 24 hours and are single-use.
- Receipt-page `orderId`s are opaque, unguessable identifiers
  (≥128 bits of entropy). Knowing one order's URL does not let
  you enumerate other orders.
- Outgoing Nostr DMs are NIP-44 encrypted to the buyer's pubkey.
  Relay delivery is best-effort; the in-app receipt page is the
  canonical record.
- The buyer session is a `jose`-signed JWT held in an httpOnly,
  Secure, SameSite=Lax cookie. It carries the pubkey and an
  expiry; never a private key.
- The `/panel/*` middleware checks the session pubkey against
  `ADMIN_PUBKEYS` before rendering. Non-admins see 404. The
  admin API namespace `/api/admin/*` enforces the same check on
  every request, not just at page load.
- Updates to payment-destination fields (CBU, alias) require a
  NIP-07 re-sign at save time. A stolen session cookie alone
  cannot redirect future settlement to an attacker's bank.
- Every panel mutation writes a row to `admin_audit_log` —
  timestamp, actor pubkey, route, action, payload diff (secrets
  redacted). Read-only forever; there is no UI to delete rows.
- All external links use `target="_blank" rel="noopener noreferrer"`.
- CSP set in `next.config.ts` headers — `default-src 'self'`,
  scripts from self, images from `https:` and `data:`. Fonts
  from `fonts.gstatic.com` and styles from `fonts.googleapis.com`
  are allowed for `next/font/google`. The Wapu invoice QR is
  generated client-side; no third-party QR service is loaded.

## What is intentionally not here

- No email integration. No email-sender provider, no email field
  at checkout, no inbox-deliverability concerns.
- No *required* buyer accounts. Anonymous purchase is always
  available; the opaque receipt URL is enough to walk away with
  the redemption code. Optional Nostr login adds history and
  reliable DM push (ADR
  [0007](decisions/0007-optional-nostr-buyer-login.md)).
- No multi-tenant. One deployment per merchant. Per-deployment
  Postgres, per-deployment env, per-deployment admin list.
- No merchant signup or onboarding flow on the deployed site.
  Each merchant forks the repo. Onboarding is in the README and
  the deployer's terminal.
- No CMS for landing content, page titles, branding, or copy.
  Those are code (SCSS, next-intl JSON, TS modules) — the panel
  only owns offerings and operational settings.
- No scheduling/calendar. Codes are redeemed in person; the
  merchant's existing booking process is unchanged.
- No stock counts. Codes and downloads are infinite.
- No refunds, resends, or DM-from-the-UI in v1. Read-only over
  orders/buyers (ADR
  [0008](decisions/0008-merchant-admin-dashboard.md)). Deferred
  to v1.1.
- No buyer-side wallet detection.
- No second settlement rail. Wapu only.

If you find yourself reaching for any of the above, check the
ADRs first — the omission is probably deliberate.
