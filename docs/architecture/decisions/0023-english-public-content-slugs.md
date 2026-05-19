# 0023. Rename public content pages to English slugs

- **Date**: 2026-05-19
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-19

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-19 | — | Initial version. | Record why the last two Spanish-slug public pages were renamed to English and why — unlike the earlier buyer-route renames — this one ships without a back-compat redirect, so a future contributor reads it as a deliberate choice rather than a missing redirect. |

---

## Context

ADR [0014](0014-marketplace-open-to-all-logged-in-users.md) moved
every logged-in and public buyer route to an English,
language-neutral slug (`/my-courses`, `/explore`, `/sign-in`,
`/receipt/[orderId]`, …). It deliberately left two public content
pages on their original Spanish slugs — `/como-funciona` and
`/caracteristicas` — with the rationale "retained for share-link
continuity": the assumption was that external links might already
point at them.

That assumption no longer holds. The platform is pre-launch — it
lives on `develop`, there is no production deployment, and nothing
external links to those slugs. The "continuity" the carve-out
protected does not exist yet, so the only thing the Spanish slugs
buy us is an inconsistent public surface: every sibling route is
English (`/explore` resolves, `/how-it-works` would 404), which is
exactly the wart ADR 0014 set out to remove.

The slug is the App Router folder name; next-intl serves it
locale-prefixed as-needed (`/how-it-works`, `/en/how-it-works`).
There is intentionally **no** next-intl `pathnames` map (one
canonical slug per route, not per-locale slugs), so the only
consistent option is a single English slug.

## Decision

**Rename the last two Spanish-slug public pages to English. No
back-compat redirect — this is a clean pre-launch rename.**

- `app/[locale]/como-funciona` → `app/[locale]/how-it-works`
- `app/[locale]/caracteristicas` → `app/[locale]/features`
- **No `proxy.ts` entry.** The earlier Spanish→English renames
  (`/explorar`, `/iniciar-sesion`, `/gracias/*`, `/reclamar/*`)
  carry a 308 because they predate this point and we wanted to be
  safe. This rename does not: there are no links to break, and a
  permanent redirect that protects nothing is permanent dead
  weight. If a production link to a Spanish slug ever turns up
  before launch, add the redirect then.
- `lib/admin/ar-bank-id.ts` `RESERVED_SLUGS` gains `how-it-works`,
  `features`, and `faq` (the last was previously missing and
  claimable as a user slug). The old Spanish names are **not**
  reserved — nothing routes there anymore and no redirect needs
  protecting.
- `sitemap.ts`, the navbar/mobile-menu `SECTIONS` lists, the
  per-page `alternatesFor(...)` canonical/hreflang argument, and
  the routing doc move to the new slugs. i18n message namespaces
  (`howItWorks`, `features`) are unchanged — only the URL moved,
  not the translation keys.

This closes the "static content pages retained for share-link
continuity" carve-out of ADR 0014. Every public route is now
English and language-neutral.

A copy correction shipped alongside this rename (the Features
page advertised opt-in auto-renewal — deferred by ADR
[0020](0020-defer-autorenewal-from-mvp.md) — and a per-merchant
fork/self-host model — retired by ADRs
[0004](0004-static-config-deployment.md) /
[0014](0014-marketplace-open-to-all-logged-in-users.md)). That is
a copy fix governed by those ADRs, not a new decision; it is
noted here only because it landed in the same change.

## Consequences

### Positive

- Every public URL is English and language-neutral. No more
  "`/explore` works but `/caracteristicas` is its sibling"
  surprise.
- No new permanent rows in the `proxy.ts` redirect table. The
  redirect chain only carries redirects that protect something
  real.
- The reserved-slug list is now complete for public routes
  (`/faq` was previously claimable as a user slug — fixed).

### Negative

- If a Spanish-slug link is shared **before** launch (e.g. in a
  demo or a chat), it 404s instead of redirecting. Accepted: the
  window is small, the audience is the team, and the fix (add a
  `proxy.ts` row) is a one-liner if it ever matters.
- This rename is **not** reversible for free post-launch; the
  no-redirect reasoning is explicitly "pre-launch only". A future
  rename of a *live* route must add the 308, per the existing
  pattern.

### Neutral

- next-intl config is untouched; the rename is a folder move plus
  reference updates.
- Translation keys are unchanged; `messages/{es,en}.json`
  `howItWorks` / `features` namespaces keep their names.

## Alternatives considered

- **Keep the Spanish slugs (status quo / ADR 0014 carve-out).**
  Rejected: the "external links might exist" premise that
  justified the carve-out is false pre-launch, and leaving two
  pages on Spanish slugs while every sibling is English is the
  exact inconsistency the English-convention decision exists to
  remove.
- **Rename *and* add a 308 redirect anyway** (mirror the earlier
  buyer-route renames). Rejected: a redirect that protects no
  existing link is permanent maintenance weight; the project's
  own precedent for redirects (ADR 0014/0017) is "protect links
  that could already exist", which does not apply here.
- **Add a next-intl `pathnames` map for per-locale slugs.**
  Rejected: the project deliberately keeps one canonical slug per
  route and has no `pathnames` map; per-locale slugs add routing
  config and a translation step for a marketing benefit the
  English-convention decision already weighed and declined.

## References

- ADR [0014](0014-marketplace-open-to-all-logged-in-users.md) —
  established the English route convention; this ADR closes its
  static-page carve-out.
- ADR [0017](0017-flatten-seller-urls.md) — prior pre-launch URL
  rename (kept a redirect because production links could exist;
  contrast with this one).
- ADR [0020](0020-defer-autorenewal-from-mvp.md),
  [0004](0004-static-config-deployment.md) — govern the Features
  copy correction that shipped alongside.
- `docs/architecture/routing.md` — the route map.
