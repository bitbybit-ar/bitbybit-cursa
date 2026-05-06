# 0002. Hardcode settlement via Wapu

- **Date**: 2026-05-05
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-05

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-05 | — | Initial version. | Pin the settlement choice before scaffolding so the codebase does not grow a speculative abstraction. |

---

## Context

Cursá needs a payment rail that:

1. Accepts Bitcoin from buyers (Lightning preferred — instant, low
   fee).
2. Settles to Argentine pesos in the merchant's bank, because
   educators pay rent in pesos and don't want to manage sats.
3. Requires no merchant-side KYC for hackathon-grade onboarding.

Wapu fits all three: Lightning in, ARS to CBU/alias out, no KYC,
open source, production-tested for three years. It is also the
sponsor of La Crypta Hackathon #3, where this project is being
submitted.

A more flexible design would abstract over "settlement provider" so
that a future merchant could opt into a different rail (Strike,
Lemon, OKX, sats kept self-custody, etc.). That abstraction has a
real cost: a settlement interface, multiple adapter implementations,
config plumbing, and corresponding documentation.

## Decision

In v1, settlement is **hardcoded to Wapu**. There is no settlement
abstraction layer, no adapter interface, no provider switch in the
merchant config.

The Wapu API is called directly from the checkout API route and the
webhook handler. The Wapu API key lives in `WAPU_API_KEY`. There is
no `SETTLEMENT_PROVIDER=...` indirection.

## Consequences

### Positive

- One less abstraction to maintain and document.
- The hackathon pitch is honest: "we built on Wapu" instead of "we
  could build on Wapu among other things."
- Smaller surface area for bugs in the payment path.
- The merchant config stays small (no provider-specific block).

### Negative

- A future merchant who wants to keep sats self-custody must wait
  for v2 (or fork the codebase).
- If Wapu changes its API contract, every deployment must update; we
  have no fallback rail.

### Neutral

- The decision can be revisited in a later ADR. Adding the
  abstraction post-hoc means refactoring the checkout and webhook
  paths, which is bounded work.

## Alternatives considered

- **Define a `SettlementProvider` interface from day one** — rejected
  for v1 because the only adapter would be `WapuProvider`, and the
  abstraction would be speculative. YAGNI applies.
- **Per-deployment provider choice via config** — rejected for v1
  for the same reason; defer until a second real provider exists.

## References

- <https://docs.wapu.app/api-docs/en>
- <https://github.com/wapu-app/wapu-cli>
- ADR [0001](0001-record-architecture-decisions.md) — the ADR
  practice this record follows.
