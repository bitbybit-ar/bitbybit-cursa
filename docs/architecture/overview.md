# Architecture overview

> **Status:** Active
> **Last updated:** 2026-05-06

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-06 | Notifications & delivery, Payment flow, Auto-renewal flow, Security, Merchant config, What is intentionally not here, Table of Contents | Added the Notifications & delivery section. Removed email from the payment flow diagram, the auto-renewal flow diagram, the security section, the merchant config (`merchant.email` field dropped), and the intentionally-not-here list (added "no email"). Updated TOC. | The decision in ADR 0006 makes the delivery channel in-app receipt + optional Nostr DM. The overview was still describing an email-based model that no longer matches the architecture. |
| 2026-05-06 | SEO surface, Theming, Table of Contents | Added the SEO surface section (per-locale metadata, Organization + WebSite JSON-LD, dynamic OG image, sitemap, robots, manifest) and the Theming section (next-themes wrapper, copied token system, Nunito + Nunito Sans via next/font). Documented the new `app/manifest.ts`, `app/robots.ts`, `app/sitemap.ts`, `app/[locale]/opengraph-image.tsx`, `lib/contexts/theme-context.tsx`, `lib/env.ts`, `lib/seo.ts`. | The initial scaffold landed those pieces; the overview must reflect what the code actually does so contributors don't have to reverse-engineer it. |
| 2026-05-05 | — | Initial version. | Document the v0 architecture before any code lands so the scaffold has a reference shape to follow. |

---

## Table of Contents

1. [What this app is](#what-this-app-is)
2. [Stack](#stack)
3. [Routing](#routing)
4. [SEO surface](#seo-surface)
5. [Theming](#theming)
6. [Product primitives](#product-primitives)
7. [Payment flow](#payment-flow)
8. [Auto-renewal flow (optional)](#auto-renewal-flow-optional)
9. [Notifications & delivery](#notifications--delivery)
10. [Merchant config](#merchant-config)
11. [Security](#security)
12. [What is intentionally not here](#what-is-intentionally-not-here)

---

## What this app is

Cursá is a Next.js storefront app deployed once per merchant. Each
deployment serves one educator: their catalog, their branding,
their checkout, their CBU. The repo is intended to be forked or
templated.

A buyer visits `cursa.bitbybit.com.ar` (the demo) or
`tienda.<merchant-domain>` (a forked deployment), browses
offerings, clicks one, gets a Lightning invoice, pays it, and
lands on a permanent receipt page that shows their redemption code
or download link. If they connected a Nostr identity at checkout,
an encrypted DM with the same content lands in their Nostr client.

Wapu sits between the Lightning invoice and the merchant's bank.
It accepts the sats, converts to ARS at market rate, and pushes
pesos to the merchant's CBU or alias.

## Stack

- **Next.js 16** (App Router) — hybrid: static for catalog pages,
  server for `/api/checkout` and `/api/wapu/webhook`.
- **next-intl** — Spanish (default) and English; locale routed via
  `app/[locale]/...`.
- **next-themes** — Light/dark mode.
- **SCSS modules** — per-component styles. Tokens in
  `styles/_theme.scss`.
- **Wapu API** — Lightning invoice creation, ARS withdrawal,
  payment status. See <https://docs.wapu.app/api-docs/en>.
- **Nostr** — server-side signing for outgoing DMs (likely via
  `nostr-tools` and `@noble/secp256k1`); NIP-07 client-side for
  buyer identity at checkout.
- **Vercel** — Hobby plan plus Vercel Cron when auto-renewal is on.

## Routing

```text
/                                → 307 redirect to /es
/es                              → catalog
/en                              → catalog
/[locale]/o/[slug]               → offering detail + buy button
/[locale]/checkout/[invoiceId]   → invoice + QR + status poll
/[locale]/gracias/[orderId]      → permanent receipt page (the
                                    canonical delivery channel)
/api/checkout                    → POST: creates Wapu invoice
/api/wapu/webhook                → POST: receives Wapu payment events
/api/cron/renew                  → GET: triggered by Vercel Cron when
                                    features.autorenewal is on
/sitemap.xml, /robots.txt, /manifest.webmanifest
```

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

Only wired in when `features.autorenewal: true` in the merchant
config. When the flag is off, the cron schedule, the NWC client,
and the encrypted-secrets storage stay unwired in the deployment.

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

## Merchant config

Single YAML file, committed to the repo:

```yaml
merchant:
  name: "Tecla Ciudad Jardín"
  cbu: "..."         # or alias
  domain: "..."

features:
  autorenewal: false  # opt-in; when off, NWC, cron, and
                      # secret store stay unwired

theme:
  primary: "#..."
  logo: "/logo.svg"

catalog:
  - slug: "bono-4-clases"
    type: "code"
    title: "Bono 4 clases"
    price_ars: 28000
    description: "Cuatro clases de piano, válidas por 30 días."
  - slug: "metodo-czerny"
    type: "download"
    title: "Czerny op. 599 (PDF)"
    price_ars: 4500
    asset: "private/czerny.pdf"
```

A future evolution may move this into a small admin UI or a
database; v1 is deliberately a flat file. See ADR
[0004-static-config-deployment](decisions/0004-static-config-deployment.md).

## Security

- HTTPS via Vercel, HSTS preload set.
- Wapu API key, NWC encryption key, and the deployment's Nostr
  signing key (`NOSTR_NSEC`) live in Vercel environment
  variables. Never reach the client.
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
- All external links use `target="_blank" rel="noopener noreferrer"`.
- CSP set in `next.config.ts` headers — `default-src 'self'`,
  scripts from self, images from `https:` and `data:`. Fonts
  from `fonts.gstatic.com` and styles from `fonts.googleapis.com`
  are allowed for `next/font/google`. The Wapu invoice QR is
  generated client-side; no third-party QR service is loaded.

## What is intentionally not here

- No email integration. No email-sender provider, no email field
  at checkout, no inbox-deliverability concerns.
- No buyer accounts, no login. The receipt URL is the identity.
- No multi-tenant. One deployment per merchant.
- No scheduling/calendar. Codes are redeemed in person; the
  merchant's existing booking process is unchanged.
- No stock counts. Codes and downloads are infinite.
- No refunds UI. Manual on the merchant's side is fine for v1.
- No buyer-side wallet detection.
- No second settlement rail. Wapu only.

If you find yourself reaching for any of the above, check the
ADRs first — the omission is probably deliberate.
