# Routing

> **Status:** Active
> **Last updated:** 2026-05-09

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-09 | Conventions, Buyer flow | Switched next-intl to `localePrefix: "as-needed"`. Spanish (default) is now served unprefixed (`/`, `/panel`, …) and English keeps the `/en` prefix. | Spanish is the primary audience; the `/es` prefix added a redirect hop and made every share/canonical URL a level deeper than necessary. As-needed gives Spanish the natural URL while preserving an unambiguous English surface. |
| 2026-05-08 | Panel API | Removed `/api/admin/upload`; image uploads now go browser-direct to Blossom servers. | ADR 0011 pins Blossom for image storage. There is no server-side proxy, so the route does not exist; documenting it would mislead contributors into building one. |
| 2026-05-07 | Buyer flow | Renamed checkout segment from `[invoiceId]` to `[orderId]`. | Status polling lives at `/api/orders/[orderId]`; the order id is the opaque key the buyer carries from checkout to receipt; using the same name across all three surfaces removes a translation step for contributors. |
| 2026-05-06 | — | Initial version. | Pin the full route map (buyer, account, subscriber, static, panel, API) before app code lands so contributors do not have to reconstruct it from this conversation or scattered ADRs. |

---

## Table of Contents

1. [Conventions](#conventions)
2. [Buyer flow](#buyer-flow)
3. [Account](#account)
4. [Subscriber (auto-renewal)](#subscriber-auto-renewal)
5. [Static](#static)
6. [Panel (admin)](#panel-admin)
7. [API routes](#api-routes)
8. [Special files](#special-files)
9. [What is intentionally not routed](#what-is-intentionally-not-routed)

---

## Conventions

- All user-facing routes are scoped to `/[locale]/...` in the
  filesystem, but the wire shape is **as-needed**: Spanish
  (`es`, the default locale) is served **without** a locale
  prefix, and English (`en`, secondary) is served with `/en`.
  So `/[locale]/panel` resolves to `/panel` in Spanish and
  `/en/panel` in English. next-intl middleware redirects
  `/es/...` → `/...` and handles `Accept-Language`.
- Slugs are Spanish-default, lowercase, kebab-case, and without
  diacritics (`/configuracion`, not `/configuración`). The
  in-page copy uses the accented form.
- Dynamic segments use the shape that survives the longest:
  opaque ids for orders (`[orderId]`), opaque ids for invoices
  (`[invoiceId]`), human slugs for offerings (`[slug]`), pubkeys
  for buyers (`[pubkey]`).
- API routes live under `/api/...`, never under `/[locale]/api`.
  They are language-agnostic.
- Panel routes are gated by middleware that checks the Nostr
  session against `ADMIN_PUBKEYS` (env). Non-admins see 404, not
  403 — the surface is not advertised. Decision pinned in ADR
  [0008](decisions/0008-merchant-admin-dashboard.md).

## Buyer flow

The critical path. Optimised for the buyer who lands cold,
clicks, pays, and walks away with a redemption code or download.

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing + catalog (Spanish) | Default locale, no prefix. |
| `/en` | Landing + catalog (English) | Secondary locale, prefixed. |
| `/[locale]` | Filesystem segment | Source-of-truth shape under `app/[locale]/...`; resolves to the unprefixed URL for `es` and to `/en/...` for `en`. |
| `/[locale]/c/[slug]` | Offering detail | Description, what the buyer gets, price (sats + ARS), CTA. `c` not `cursos` to avoid colliding with the brand word. |
| `/[locale]/checkout/[orderId]` | Lightning invoice | QR + copy-to-clipboard, status polling against `/api/orders/[orderId]`. Survives reload. If `settings.features_autorenewal` is on, both pay-buttons (one-shot vs NWC) are visible — buyer self-selects. |
| `/[locale]/gracias/[orderId]` | Permanent receipt | Redemption code (`type=code`) or short-lived signed download URL (`type=download`). Inline "Conectá tu Nostr para guardar este pedido" prompt. Decision pinned in ADR [0006](decisions/0006-nostr-and-inapp-delivery.md). |

## Account

Optional. A buyer can complete the entire purchase flow without
ever hitting any of these. Decision pinned in ADR
[0007](decisions/0007-optional-nostr-buyer-login.md).

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/iniciar-sesion` | Nostr sign-in | NIP-07 / nsec / NIP-46. Module ported from bitbybit-arena. |
| `/[locale]/mis-compras` | Order history | Logged-in only. Each row links back to `/gracias/[orderId]`; do not duplicate the receipt page under `/mis-compras/[orderId]`. |
| `/[locale]/reclamar/[orderId]` | Claim a past anonymous order | Logged-in buyer pastes the `orderId` from a prior anonymous purchase to attach it to their pubkey. |

## Subscriber (auto-renewal)

Only rendered when `settings.features_autorenewal` is `true`. The
code paths are deployed but dormant otherwise (amended ADR
[0005](decisions/0005-prepaid-default-autorenewal-optin.md)).

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/suscripcion` | Manage NWC connection | Next renewal date, spend cap, revoke. Own page (not a section of `/mis-compras`) because revoking NWC has different consequences than cancelling a one-shot order. |

## Static

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/preguntas` | FAQ | What is Lightning, do I need a wallet, what is Wapu, why is this Argentina-only. |
| `/[locale]/terminos` | Terms of service | |
| `/[locale]/privacidad` | Privacy policy | |

## Panel (admin)

All routes gated by the `/panel` middleware (Nostr session +
`ADMIN_PUBKEYS` membership). Decision pinned in ADR
[0008](decisions/0008-merchant-admin-dashboard.md). Read-only
surface over orders/buyers; CRUD on offerings; settings with
NIP-07 re-sign for payment-destination changes.

### Overview & analytics (read-only)

| Route | Purpose |
|---|---|
| `/[locale]/panel` | Overview cards: revenue MTD, pending orders, recent sales feed |
| `/[locale]/panel/ventas` | Aggregates over time, filters, CSV export |

### Orders & buyers (read-only)

| Route | Purpose |
|---|---|
| `/[locale]/panel/pedidos` | Order list with filters (status, offering, date, identified-vs-anonymous) and search (orderId, payment hash, pubkey) |
| `/[locale]/panel/pedidos/[orderId]` | Order detail: buyer pubkey if any, payment hash, Wapu settlement reference, redemption state |
| `/[locale]/panel/estudiantes` | Identified buyers list. Anonymous orders are countable (aggregate badge) but not enumerable here. Search by pubkey or NIP-05. |
| `/[locale]/panel/estudiantes/[pubkey]` | Per-buyer detail: their orders, total spent, first/last purchase, contact via Nostr DM (read-only display in v1; the action button is v1.1) |

### Offerings (full CRUD)

| Route | Purpose |
|---|---|
| `/[locale]/panel/ofertas` | Offerings list |
| `/[locale]/panel/ofertas/nueva` | Create offering form |
| `/[locale]/panel/ofertas/[slug]/editar` | Edit form. Delete is a confirm button on this page; not a separate route. |

### Settings

| Route | Purpose |
|---|---|
| `/[locale]/panel/configuracion` | CBU, alias, autorenewal toggle. Changes to CBU or alias require a NIP-07 re-sign at save time. |

## API routes

Language-agnostic. All routes that mutate state require the
appropriate session (buyer Nostr session for `/api/orders/.../claim`,
admin session for `/api/admin/*`).

### Public

| Route | Method | Purpose |
|---|---|---|
| `/api/wapu/webhook` | POST | Receives Wapu payment events. Signature-verified before any state change (CLAUDE.md rule). |
| `/api/orders/[orderId]` | GET | Status polling for the checkout page. Public (the `orderId` is the access key). |

### Auth (ported from bitbybit-arena)

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/nostr` | POST | Challenge / response: client signs a nonce, server verifies and issues a session |
| `/api/auth/session` | GET | Returns the current session (pubkey, exp) |
| `/api/auth/signout` | POST | Clears the session cookie |

### Buyer-scoped

| Route | Method | Purpose |
|---|---|---|
| `/api/orders/[orderId]/claim` | POST | Logged-in buyer attaches a past anonymous order to their pubkey |
| `/api/nip05/resolve` | GET | Server-side NIP-05 → pubkey lookup (used by the npub/NIP-05 paste flow at checkout) |

### Admin-scoped (under `/api/admin`, gated by `ADMIN_PUBKEYS`)

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/orders` | GET | List + filter + search for `/panel/pedidos` |
| `/api/admin/stats` | GET | Aggregates for `/panel` and `/panel/ventas` |
| `/api/admin/offerings` | GET, POST, PATCH, DELETE | Offering CRUD for `/panel/ofertas/*` |
| `/api/admin/settings` | GET, PATCH | Read + update settings; CBU/alias updates require a NIP-07 re-sign payload |

Image uploads do **not** ride a server route. Per ADR 0011 the
panel uploads directly from the browser to one or more Blossom
servers (`NEXT_PUBLIC_BLOSSOM_SERVERS`), authenticated by a
kind:24242 signed event produced via `signWithPrompt`. The
returned hash-addressed URL lands in `offerings.image_url`.

### Subscriber (only mounted when `features_autorenewal` is on)

| Route | Method | Purpose |
|---|---|---|
| `/api/cron/renew` | GET | Triggered by Vercel Cron daily; runs renewal pulls |
| `/api/nwc/connect` | POST | Receives an NWC connection string from a subscribing buyer |
| `/api/nwc/revoke` | POST | Buyer revokes the NWC grant from `/[locale]/suscripcion` |

## Special files

| File | Purpose |
|---|---|
| `app/[locale]/layout.tsx` | Root layout, `generateMetadata`, theme provider, fonts |
| `app/[locale]/not-found.tsx` | 404 |
| `app/[locale]/error.tsx` | Error boundary |
| `app/[locale]/opengraph-image.tsx` | Dynamic OG image per locale |
| `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts` | SEO surface |

## What is intentionally not routed

- **No merchant signup or onboarding flow on the deployed site.**
  Each merchant forks the repo (single-tenant per ADR
  [0004](decisions/0004-static-config-deployment.md)). Onboarding
  happens in the README and the deployer's terminal.
- **No password-reset, email-verification, or account-deletion
  flows.** Identity is Nostr; recovery is whoever holds the nsec.
- **No buyer-side wallet detection page.** Decision pinned in
  ADR [0005](decisions/0005-prepaid-default-autorenewal-optin.md).
- **No `/admin/*` (English).** The admin surface lives at
  `/[locale]/panel/...`; `/admin` 404s.
- **No `/api` versioning prefix in v1.** If we break a public
  contract (only `/api/wapu/webhook` and `/api/orders/[orderId]`
  qualify) we will add `/api/v2/...` at that time.
- **No refund, resend, or DM-from-the-UI routes in v1.** Those
  are write actions over orders/buyers, deferred to v1.1 per ADR
  [0008](decisions/0008-merchant-admin-dashboard.md).
