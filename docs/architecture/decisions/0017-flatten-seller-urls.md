# 0017. Flatten seller URLs

- **Date**: 2026-05-12
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-12

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-12 | — | Initial version. | Drop the `/m/` namespace from seller storefronts and offering detail pages; supersedes the share-link-continuity clause of ADR 0016. |

---

## Context

ADR 0016 collapsed `merchants` into `users`: every signed-in Nostr
account now has a user row by definition, and "merchant" is no longer
a distinct construct. The URL still treated sellers as a side
namespace, though — `/m/[userSlug]` and `/m/[userSlug]/c/[offeringSlug]`
kept the `/m/` prefix from the pre-0014 merchant model. ADR 0016
explicitly pinned that prefix "for share-link continuity".

Two things have changed since 0016 landed:

1. **No production share links exist yet.** The marketplace is still
   pre-launch, so the continuity argument that justified the `/m/`
   carry-over no longer applies. Every external link that exists today
   was generated in development.
2. **The page semantics no longer match the prefix.** With merchants
   collapsed into users, the seller storefront is the user's public
   page. Namespacing it under `/m/` reads as "merchant marketplace"
   even though there is no separate merchant entity.

Side note: the reserved-slug list in `lib/admin/ar-bank-id.ts` already
blocks every top-level route name (`settings`, `my-courses`, `explore`,
`sign-in`, `receipt`, `claim`, `checkout`, …) plus `c` and `m`, so
flattening does not create a collision risk between user slugs and
reserved routes.

## Decision

Move the seller storefront and offering detail pages to the top level:

- **Storefront**: `/[locale]/[userSlug]`
  (formerly `/[locale]/m/[userSlug]`)
- **Offering detail**: `/[locale]/[userSlug]/c/[offeringSlug]`
  (formerly `/[locale]/m/[userSlug]/c/[offeringSlug]`)

The `c/` segment stays — slug uniqueness is per-user, so a per-user
namespace for the offering slug keeps two sellers' `intro-bitcoin`
courses from colliding.

No legacy 308 redirect is added: the codebase has not shipped to
production yet, so there are no external links to preserve. If this
changes before launch we can add the redirect at that point.

## Consequences

- The reserved-slug list in `lib/admin/ar-bank-id.ts` is now the only
  thing standing between a user slug and an accidental route collision.
  Adding a new top-level route (e.g. a future `/about`) requires
  adding the same string to `RESERVED_SLUGS` in the same change.
- ADR 0016's URL clause ("the public path `/m/<slug>` is unchanged")
  is superseded by this ADR. ADR 0016 itself remains active for the
  database and rename half of the decision.
- Internal references to `/m/` in code comments, i18n copy
  (`/m/your-slug` in `step2Body`, `multiTenantSelfHostBody`, and
  `slugHint`), and the `OfferingCard` href computation have been
  updated to the flat shape in the same change that introduces this
  ADR.
- `getOfferingByUserAndSlug` and `listOfferingsForUserSlug` now fall
  back to the landing's mock courses
  (`lib/mock/highlighted-courses.ts`) when the DB is unconfigured or
  the live catalog is empty, so the three seed URLs surfaced from the
  home page render real-looking demo pages.
