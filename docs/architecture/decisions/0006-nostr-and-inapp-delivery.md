# 0006. Use Nostr DMs and in-app receipts for delivery, not email

- **Date**: 2026-05-06
- **Status**: Accepted (extended by [0007](0007-optional-nostr-buyer-login.md))
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-06

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-06 | Decision, Consequences | Added a third DM trigger — logged-in Nostr buyers — alongside npub-at-checkout and NWC-derived pubkey. Cross-linked to ADR 0007. | ADR 0007 introduces optional Nostr login for buyers; DM delivery should fire automatically for logged-in sessions, so this doc must reflect that. |
| 2026-05-06 | — | Initial version. | Pin the delivery channel before scaffolding any notification code so we don't accidentally pull in an email provider. |

---

## Context

Cursá needs to deliver redemption codes and download URLs to buyers
after payment, and to push renewal/cancellation notices to
subscribers. The default in commerce tooling is transactional email
(Resend, Postmark, SES). Email requires:

- A third-party sender provider with its own API key, billing, and
  outage surface.
- Deliverability work — SPF/DKIM/DMARC records, warm-up, inbox
  reputation monitoring.
- An email field at checkout (and the validation around it).
- An unsubscribe surface and one-click compliance.

BitByBit's other projects use Nostr as the identity primitive.
Arena uses Nostr-signed challenges. Habits lives in a
Nostr-adjacent Lightning ecosystem. A Nostr-first delivery channel
is consistent with the rest of the family.

For auto-renewal subscribers (ADR
[0005](0005-prepaid-default-autorenewal-optin.md)), Cursá already
has the buyer's Nostr identity via the NWC connection. Asking the
same buyer for an email at checkout is redundant.

For pre-paid buyers who do not connect Nostr, a simple in-app
receipt page (URL with an opaque, unguessable `orderId`) is
sufficient — they bookmark the URL or screenshot the code. The
storefront can display return-CTAs ("Renová tu bono") for expiring
packs without needing to push anything.

## Decision

**Primary delivery: in-app receipt page** at
`/[locale]/gracias/[orderId]` with a permanent, unguessable
`orderId`. It renders the redemption code (for `code` offerings)
or a short-lived signed download URL (for `download` offerings),
plus order summary. Always shown immediately after payment — does
not require the buyer to provide any identity.

**Optional Nostr DM** (NIP-44 encrypted) for buyers who connect a
Nostr identity at checkout via NIP-07 (browser extension) or by
pasting an npub. The DM contains the receipt URL.

**Auto-renewal subscribers** automatically receive Nostr DMs for
renewal confirmations and cancellation notices. Their pubkey
comes from the NWC connection — no separate identity prompt.

**Logged-in buyers** (ADR
[0007](0007-optional-nostr-buyer-login.md)) automatically receive
DMs for every order while a session is active — the session
pubkey is the destination. They do not need to paste an
identifier at checkout. This is the third DM trigger alongside
npub-at-checkout (above) and NWC-derived pubkey (subscribers).

**No email integration.** No email-sender provider, no email field
at checkout, no inbox-deliverability concerns, no unsubscribe
page.

The deployment uses a server-side Nostr signing key (env:
`NOSTR_NSEC`) to sign and encrypt outgoing DMs. Merchants do not
manage Nostr keys; the deployment owns one.

## Consequences

### Positive

- One fewer third-party dependency. No email provider to integrate,
  budget, or monitor.
- Consistent with the BitByBit family's Nostr-first identity model.
- No SPF/DKIM/DMARC, no inbox reputation, no compliance surface.
- The in-app receipt is always reliable — it's just a URL Cursá
  controls.
- Auto-renewal subscribers already have an identity, so DMs are
  automatic with no extra config.

### Negative

- Buyers without a Nostr identity get no push notification for
  renewal nudges. They must bookmark the receipt URL or come back
  to the storefront on their own. The storefront UI can soften
  this with "Renová tu bono" CTAs.
- Nostr DM relay reliability is lower than email's. If the buyer's
  relays are offline, the DM may not reach them — they can still
  find the receipt page via the URL Cursá showed them at checkout.
- The deployment must manage a server-side Nostr signing key. Loss
  of the key means a new npub for outgoing DMs; bounded impact,
  since buyers read by their own pubkey, not by Cursá's identity.

### Neutral

- A future evolution could add SMS or WhatsApp Business push if a
  specific merchant cohort demands it. They would be additional
  optional channels alongside the in-app receipt, not replacements.
- Merchants who want their own brand identity for outgoing DMs
  can provide a custom NSEC via env in a future version. Not in v1.

## Alternatives considered

- **Transactional email (Resend, Postmark, SES)** — rejected for
  the dependency, deliverability, and identity-mismatch reasons
  above.
- **Public Nostr events tagged to the buyer** — rejected; purchases
  should be private. Encrypted DMs are the correct primitive.
- **SMS or WhatsApp Business** — rejected; AR-friendly but adds
  another provider dependency without removing the email problem.
- **In-app only, no push at all** — rejected; auto-renewal
  subscribers genuinely need a push channel for failure
  notifications, and we already have their pubkey via NWC.

## References

- [NIP-04](https://github.com/nostr-protocol/nips/blob/master/04.md)
  / [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md)
  — encrypted DMs.
- [NIP-07](https://github.com/nostr-protocol/nips/blob/master/07.md)
  — browser-extension signing.
- ADR [0002](0002-settlement-via-wapu.md) — same logic ("lean on
  the existing rail, don't abstract").
- ADR [0005](0005-prepaid-default-autorenewal-optin.md) — uses
  NWC, so we have the subscriber's pubkey for free.
