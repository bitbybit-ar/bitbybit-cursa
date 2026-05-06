# 0005. Pre-paid is always on; auto-renewal is opt-in per merchant

- **Date**: 2026-05-05
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-06

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-06 | Decision | Replaced "an email is sent" with "a Nostr DM is sent" for cancellation notices, consistent with ADR 0006. The auto-renewal payment model itself is unchanged. | The original phrasing assumed an email channel that ADR 0006 explicitly rules out. NWC subscribers' pubkey is already known, so DMs are the natural push channel. |
| 2026-05-05 | — | Initial version. | Pin the payment model before scaffolding so the auto-renewal code path can be cleanly gated from day one. |

---

## Context

Lightning has no native subscriptions. There is no "card on file"
primitive that lets a merchant pull a recurring payment from a
buyer without the buyer initiating each time. The closest
production-ready mechanism is Nostr Wallet Connect (NWC), which
lets a buyer grant a budgeted, time-boxed permission to a service.
Today NWC is supported by a handful of wallets (Alby, Mutiny,
Coinos, Primal); most Lightning users do not have an NWC-capable
wallet.

Wapu itself does not implement subscriptions, BOLT12, or NWC. It
exposes one-shot Lightning invoices in and ARS withdrawals out.
Any recurring billing must be built on top.

The merchant audience splits cleanly: some educators want recurring
billing because their offering is a monthly bono; others want
nothing more than one-shot pack sales because their students don't
have NWC wallets and don't want to set one up.

## Decision

Cursá ships **two payment flows**, with a per-merchant opt-in:

- **Pre-paid one-shot** is always on. Every offering can be sold
  as a single Lightning invoice. This works for every Lightning
  wallet that exists today.
- **NWC auto-renewal** is opt-in via a single merchant config
  flag, `features.autorenewal`. When `false`, the NWC client, the
  Vercel Cron schedule, and the encrypted-secrets storage stay
  unwired in the deployment. When `true`, every offering exposes
  a second "Autorenovar" button alongside "Comprar," and a daily
  cron job runs the renewal pulls.

There is no buyer-side wallet detection. If a buyer's wallet
cannot complete the NWC connection, the auto-renewal flow simply
fails and the buyer falls back to the one-shot button.

Renewals that fail (insufficient budget, wallet offline, NWC
permission expired) enter a grace window; after N retries the
subscription is cancelled and a Nostr DM is sent (the subscriber's
pubkey is already known via the NWC connection — see ADR
[0006](0006-nostr-and-inapp-delivery.md)).

## Consequences

### Positive

- Every merchant can use the kit on day one, regardless of their
  students' wallets.
- Merchants who do not want subscription complexity (cancellations,
  failed renewals, customer-service load) leave the flag off and
  never see the surface.
- The pitch is honest about Lightning's current limitations:
  pre-paid is the renewal flow that works in production today;
  NWC is the differentiator stretch.
- The opt-in flag means the cron, NWC client, and secret-store
  code paths are dead in deployments that don't need them —
  smaller attack surface, less to debug.

### Negative

- Two payment paths in the codebase. Both must be tested.
- Auto-renewal requires the merchant to commit to operational
  concerns (cancellation requests, retry policies,
  recurring-revenue tax implications). Documented in onboarding.

### Neutral

- BOLT12 offers and other future Lightning recurring-payment
  primitives can be added as additional opt-in surfaces under the
  same `features.*` namespace.

## Alternatives considered

- **Pre-paid only** — rejected as the v1 default for any merchant
  who explicitly wants subscriptions.
- **Auto-renewal always on** — rejected; forces every merchant to
  carry the operational burden whether they want it or not.
- **Buyer-side wallet detection that hides the auto-renewal
  button for non-NWC wallets** — rejected; buyers came to a sats
  checkout to pay sats, the merchant's flag is the only real
  decision. Two visible buttons let the buyer self-select.

## References

- <https://github.com/getAlby/sdk> — likely NWC client.
- ADR [0002](0002-settlement-via-wapu.md) — settlement.
- ADR [0003](0003-educator-vertical.md) — product wedge.
- ADR [0006](0006-nostr-and-inapp-delivery.md) — delivery channel
  (provides the cancellation/renewal Nostr DMs referenced above).
