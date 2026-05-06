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
