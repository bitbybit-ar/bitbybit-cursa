# 0003. Build a vertical kit for educators, not a generic storefront

- **Date**: 2026-05-05
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-06

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-06 | Decision | Replaced "buyer receives X by email" with "buyer receives X via the in-app receipt page (and optional Nostr DM)" so the primitive descriptions match ADR 0006. | The original phrasing assumed an email channel that ADR 0006 explicitly rules out. The product wedge itself is unchanged. |
| 2026-05-05 | — | Initial version. | Pin the product wedge before scaffolding so scope creep is visible against a written reference. |

---

## Context

The hackathon's brief is "commerce." The default response is a
generic Lightning storefront — catalog, cart, checkout, settle.
Every other team will likely build one.

A generic storefront pays the cost of every commerce concern that
exists: stock counts, variants, shipping addresses, carriers,
tax-by-destination, returns. Each of those is its own design
problem even before payments enter the picture. None of them are
unique to Lightning, and none are addressable in a hackathon
weekend without cutting corners on every one.

The Argentine educator long tail (music schools, tutors, language
academies, yoga studios, code bootcamps) has a much smaller
surface:

- Two product types: a redeemable code for in-person services,
  and a digital download for material.
- No physical fulfillment.
- No inventory.
- No tax-by-destination — services and digital goods are billed
  by the educator's own jurisdiction.
- Buyers are typically local, repeat, and known to the merchant.

This audience is also genuinely underserved by current AR payment
tooling, which means the demo writes itself: a real piano teacher
selling a real bono.

## Decision

Cursá is a **vertical OSS kit for Argentine educators**, not a
generic storefront. The catalog supports exactly two offering
types:

- `code` — buyer receives a redemption code via the in-app
  receipt page (and an optional Nostr DM if they connected a
  pubkey at checkout)
- `download` — buyer receives a signed download URL via the
  in-app receipt page (and an optional Nostr DM if they connected
  a pubkey at checkout)

Generic e-commerce features (stock, variants, shipping, tax
engines, carrier integrations, returns) are explicitly out of
scope.

## Consequences

### Positive

- Sharp, defensible scope. The MVP fits in a weekend.
- The pitch is concrete: "Stripe Checkout for Argentine
  educators," not "another Lightning storefront."
- Demo with a real merchant (Tecla Ciudad Jardín) is
  straightforward.
- Less code = less attack surface in a payment-handling app.

### Negative

- A merchant who sells physical goods cannot use Cursá. They are
  outside the wedge by design.
- Future expansion to additional verticals (e.g. fitness studios
  with scheduling, content creators with subscriptions) requires
  explicit ADRs; we do not get them "for free" from a generic
  codebase.

### Neutral

- The two-primitive model is portable to adjacent verticals (any
  service-or-digital-goods business). When that need arises, it
  gets a new ADR.

## Alternatives considered

- **Generic Lightning storefront with full e-commerce features**
  — rejected because every team will build one and the cost of
  doing it well exceeds a hackathon budget.
- **Music schools only** — rejected as too narrow; the same kit
  serves yoga studios, tutors, and language academies with no
  extra code.
- **Two-sided marketplace (educators + students)** — rejected;
  two-sided products are a death sentence in a weekend.

## References

- ADR [0002](0002-settlement-via-wapu.md) — settlement provider.
- ADR [0004](0004-static-config-deployment.md) — deployment model.
- ADR [0006](0006-nostr-and-inapp-delivery.md) — delivery channel.
