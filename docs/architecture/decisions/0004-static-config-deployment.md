# 0004. Each merchant forks and deploys their own instance

- **Date**: 2026-05-05
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-05

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-05 | — | Initial version. | Pin the deployment model before scaffolding so we don't accidentally grow multi-tenant code paths. |

---

## Context

A storefront kit can be delivered in two architectural shapes:

1. **Multi-tenant SaaS.** One deployment serves many merchants, each
   identified by subdomain or path. Merchants log in to manage their
   catalog. Requires authentication, a database, an admin UI, tenant
   isolation in every query.
2. **Single-tenant template.** Each merchant gets their own
   deployment from a forked or templated repo. Configuration lives in
   a flat file in the repo. No login, no shared database.

Multi-tenant is the obvious "product" shape. It is also a substantial
amount of code — auth, multi-tenancy, admin UI, billing of the
platform itself — none of which is the actual hackathon contribution.

Single-tenant is a smaller, more boring shape. It also matches how
Argentine micro-merchants currently work: each runs their own
Wordpress/Wix/Shopify, owns their own data, and pays for their own
domain.

## Decision

In v1, **each merchant forks (or templates) the Cursats repo, edits
`merchant.yaml`, and deploys their own Vercel project** with their
own domain. There is no multi-tenant code path, no admin UI, no
shared database, and no platform-level authentication.

The repo doubles as the storefront app and the configuration source.
Updating the catalog is a Git commit.

## Consequences

### Positive

- Vastly less code. The MVP fits in a weekend.
- No credentials, no shared database, no tenant isolation bugs.
- Merchants own their data the same way they own a Wordpress install.
- Each deployment is self-contained — losing one does not affect any
  other.
- The hackathon judges can fork the repo and deploy a working
  storefront in under ten minutes.

### Negative

- Non-technical merchants cannot self-onboard. They need help with
  Git and Vercel. We accept this for v1; the early-adopter audience
  is technical-adjacent (small studios with a friend who codes).
- Updates to the template do not propagate automatically to forks.
  Each fork pulls upstream when the merchant chooses to.
- Catalog updates require a deploy. For low-frequency catalogs (most
  educators) this is fine; for high-frequency it would not be.

### Neutral

- A future v2 could layer a multi-tenant admin on top of the same
  storefront app, with the flat-file config remaining as the export
  format. The decision can evolve without throwing the v1 code away.

## Alternatives considered

- **Multi-tenant SaaS from day one** — rejected; out of weekend scope
  and not the hackathon's contribution.
- **Headless config service (one shared API, many static
  storefronts)** — rejected; introduces a backend with no clear v1
  benefit over a flat file.

## References

- ADR [0003](0003-educator-vertical.md) — product wedge.
- ADR [0005](0005-prepaid-default-autorenewal-optin.md) — payment
  model that this deployment shape supports.
