# Routing

> **Status:** Active
> **Last updated:** 2026-05-09

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-09 | Conventions, Account, Panel, API, Not routed | Removed the `/panel/*` namespace; creator surfaces moved to top-level routes (`/mis-cursos`, `/configuracion`, `/mis-ventas`, `/mis-estudiantes`). Documented the legacy 308 redirects in `proxy.ts`. Recorded `/api/notifications`. | ADR 0014: every signed-in user is implicitly a creator; the merchant row is data, not a gate. |
| 2026-05-09 | Conventions, Buyer flow | Switched next-intl to `localePrefix: "as-needed"`. Spanish (default) is now served unprefixed (`/`, `/mis-cursos`, …) and English keeps the `/en` prefix. | Spanish is the primary audience; the `/es` prefix added a redirect hop and made every share/canonical URL a level deeper than necessary. As-needed gives Spanish the natural URL while preserving an unambiguous English surface. |
| 2026-05-09 | Static | Added `/como-funciona` and `/caracteristicas` rows. Corrected the FAQ row from `/preguntas` to `/faq` to match the implemented folder. | Three new public content pages shipped (How it works, Features, FAQ); the FAQ slug recorded here had drifted from the actual route, which would mislead contributors. |
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
  So `/[locale]/mis-cursos` resolves to `/mis-cursos` in Spanish
  and `/en/mis-cursos` in English. next-intl middleware redirects
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
- Creator routes (`/mis-cursos`, `/mis-ventas`,
  `/mis-estudiantes`, `/configuracion`, `/onboarding`) are
  gated at the edge by `proxy.ts`: anonymous visitors bounce to
  `/iniciar-sesion?next=...`. There is no merchant-row gate —
  any signed-in user gets a placeholder merchant row lazily on
  first server-side need. Decision pinned in ADR
  [0014](decisions/0014-marketplace-open-to-all-logged-in-users.md).

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

The account surface is unified per ADR
[0014](decisions/0014-marketplace-open-to-all-logged-in-users.md):
every signed-in user is implicitly a creator, so My purchases /
My courses / Settings / Sign out all share one navbar dropdown.
Anonymous purchases stay supported (ADR
[0007](decisions/0007-optional-nostr-buyer-login.md)).

### Sign-in

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/iniciar-sesion` | Nostr sign-in | NIP-07 / nsec / NIP-46. Module ported from bitbybit-arena. |
| `/[locale]/onboarding` | Optional slug claim | Reachable from explicit prompts; users who land on a creator surface first get an auto-generated placeholder slug they can rename later. |
| `/[locale]/reclamar/[orderId]` | Claim a past anonymous order | Logged-in buyer pastes the `orderId` from a prior anonymous purchase to attach it to their pubkey. |

### Buyer-side

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/mis-compras` | My purchases | Logged-in only. Each row links back to `/gracias/[orderId]`; do not duplicate the receipt page under `/mis-compras/[orderId]`. |

### Creator-side (any signed-in user, gated at the edge)

| Route | Purpose | Notes |
|---|---|---|
| `/[locale]/mis-cursos` | My courses | Lists active and archived offerings owned by the user's merchant row. |
| `/[locale]/mis-cursos/nueva` | New course form | Creates an offering. Triggers placeholder-merchant lazy creation on first hit. |
| `/[locale]/mis-cursos/[slug]/editar` | Edit course | Same form as `nueva`, prefilled. Archive button lives on this page. |
| `/[locale]/mis-ventas` | My sales | Sales history, read-only in v1. Filters and detail pages mirror the old `/panel/pedidos` shape. |
| `/[locale]/mis-ventas/[orderId]` | Sale detail | Buyer pubkey if any, payment hash, Wapu settlement reference, redemption state. |
| `/[locale]/mis-estudiantes` | My students | Identified buyers who purchased from this user. Anonymous orders aggregate but do not enumerate. |
| `/[locale]/mis-estudiantes/[pubkey]` | Student detail | Per-buyer history. |
| `/[locale]/configuracion` | Settings | CBU, alias, autorenewal toggle, slug + display name. CBU/alias updates require a NIP-07 re-sign at save time. |

### Legacy redirects

`/panel`, `/panel/ofertas*`, `/panel/configuracion`,
`/panel/pedidos*`, `/panel/estudiantes*` 308 to the matching new
route via `proxy.ts`. The `/panel` namespace itself is no longer
served.

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
| `/[locale]/como-funciona` | How it works | Buyer flow, merchant flow, glossary (Lightning / Wapu / Nostr), no-custody pitch, dual CTA. Drafts copy from `docs/about/mission.md` and ADRs 0002/0006/0012. |
| `/[locale]/caracteristicas` | Features | 9-card grid: sats-in/pesos-out, no custody, anonymous purchase, optional Nostr login, in-app + DM delivery, opt-in autorenewal, merchant panel, codes-or-downloads, marketplace-or-self-host. |
| `/[locale]/faq` | FAQ | Ten Q&A entries covering Lightning, wallets, Wapu, Argentina-only, anonymity, delivery, lost receipts, merchant payouts, Nostr panel login, and fees. |
| `/[locale]/terminos` | Terms of service | |
| `/[locale]/privacidad` | Privacy policy | |

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
| `/api/notifications` | GET, PATCH, POST | List, mark-read, mark-all-read for the navbar bell. Returns 401 for anonymous callers; 30s polling from the bell with a tab-visibility pause. |

### Creator-scoped (under `/api/admin`, gated by signed-in session)

The `admin` prefix is historical (carried over from the merchant
panel); these routes are now reachable by any signed-in user.
Each route resolves the user's merchant row via `requireMerchant`
which lazily creates a placeholder row on first call.

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/orders` | GET | List + filter + search for `/mis-ventas` |
| `/api/admin/stats` | GET | Aggregates for the dashboard cards (revenue, pending, paid-30d) |
| `/api/admin/offerings` | GET, POST, PATCH, DELETE | Offering CRUD for `/mis-cursos/*` |
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

- **No password-reset, email-verification, or account-deletion
  flows.** Identity is Nostr; recovery is whoever holds the nsec.
- **No buyer-side wallet detection page.** Decision pinned in
  ADR [0005](decisions/0005-prepaid-default-autorenewal-optin.md).
- **No `/panel/*` namespace.** Creator surfaces moved to
  top-level routes per ADR
  [0014](decisions/0014-marketplace-open-to-all-logged-in-users.md);
  legacy paths 308-redirect via `proxy.ts`.
- **No `/api` versioning prefix in v1.** If we break a public
  contract (only `/api/wapu/webhook` and `/api/orders/[orderId]`
  qualify) we will add `/api/v2/...` at that time.
- **No refund, resend, or DM-from-the-UI routes in v1.** Those
  are write actions over orders/buyers, deferred to v1.1.
