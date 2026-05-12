# Mission

> **Status:** Active
> **Last updated:** 2026-05-12

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-12 | Body, What we value, What we don't do | Reframed the tagline from "buyers pay sats, merchants think in pesos" to the dual-rail story: buyers always pay sats; sellers pick pesos (Wapu) or sats (Lightning Address). Broadened the audience bullet from "Educators only" to "Educational creators — broadly". Replaced "merchant" with "seller" throughout. Updated the example flow to mention both rails. Updated the no-second-rail claim in "What we don't do" to the no-third-rail claim from ADR 0015. | The mission was three pivots behind: ADR 0014 opened the marketplace beyond a narrowly-defined educator set, ADR 0015 added the sats settlement rail, ADR 0016 collapsed `merchants` into `users`. The doc still framed Wapu as the only rail and educators as the only audience. |
| 2026-05-08 | Body, What we value, What we don't do | Pivoted from single-tenant tool to multi-tenant marketplace per ADR 0012. Onboarding is now "sign in with Nostr, claim a slug, paste your CBU/alias", not "developer forks the repo." Wapu direct-payment routes ARS straight to each merchant; the platform never custodies. | The single-tenant model required a developer per merchant — unsustainable for the educator audience. Wapu's direct-payment API removed the only blocker against per-invoice merchant routing. |
| 2026-05-06 | Body, What we value, What we don't do | Reframed the merchant onboarding model from "edits a config file" to "developer forks once, merchant runs everything from the dashboard." Added the panel to the value bullets and noted that catalog/CBU/autorenewal now live in Postgres, edited via `/panel`. Cross-linked ADRs 0008, 0009, 0010. | ADRs 0008–0010 dismantled `merchant.yaml` and moved operational state into Postgres + the panel. The mission still claimed merchants edit a config file, which is now false and would mislead any new contributor reading this first. |
| 2026-05-06 | What we value, What we don't do | Softened "no buyer accounts" to "no *required* buyer accounts" and noted that optional Nostr login is now in scope. Cross-linked to ADR 0007. | ADR 0007 introduces optional Nostr login for buyers (history view + reliable DM push) without breaking the anonymous-purchase floor; the mission must reflect that distinction or it reads as a contradiction. |
| 2026-05-06 | Body, What we don't do, A note on the name | Reframed delivery from email to in-app receipt + optional Nostr DM, consistent with ADR 0006. Added "A note on the name" section explaining the voseo origin. | Email is no longer part of the architecture (ADR 0006), and the meaning of "Cursá" was sitting only in conversation memory, not in the repo. |
| 2026-05-05 | — | Initial version. | Pin the project's reason for existing before any code lands. |

---

BitByBit Cursá exists so a piano teacher in Buenos Aires can
accept Bitcoin without learning what Lightning is and receive
pesos in her bank the same day — *and* so the Bitcoin-native
tutor across town can take the same payments straight to sats in
his Lightning wallet, no converter in the middle.

Educational creators — music schools, tutors, language academies,
yoga studios, code bootcamps, and anyone else publishing
classes, codes, or downloads — have been underserved by existing
payment tooling. Card processors take a cut and demand
paperwork. Direct bank transfers leak through buyer-side friction.
Sats-only solutions assume buyers and sellers are crypto-literate.

Cursá takes the opposite stance: **buyers always pay in sats; the
seller picks how those sats arrive — pesos in their CBU via Wapu,
or sats in their Lightning Address — and the protocol gets out of
the way.**

A creator signs in with her Nostr key — her user row is
materialised on the spot, her display name and avatar pulled
from her Nostr kind:0 if she has one. She picks a slug, picks a
payout rail in Settings (CBU/alias for pesos, Lightning Address
for sats), and is selling within minutes. No fork, no Vercel
project, no env wiring. Her store lives at
`cursa.bitbybit.com.ar/m/<her-slug>`. The buyer scans a QR; if
she chose Wapu, the ARS lands in her CBU; if she chose Lightning
Address, the sats land in her wallet. The platform never
custodies funds either way. A permanent in-app receipt page
delivers the redemption code or download URL; if the buyer
connected a Nostr identity at checkout, the same content also
arrives as an encrypted DM in their Nostr client.

Sovereignty is preserved as the *self-hosting* path: anyone who
wants their own deployment can fork the repo and run a
single-tenant Cursá against their own Wapu account or Lightning
Address. The hosted marketplace at `cursa.bitbybit.com.ar` is
just the default; the architecture supports either.

We are not building a generic storefront — every other team will.
We are building the smallest possible payments toolkit for the
people who genuinely benefit from sats-in with a real choice of
how those sats come out.

## What we value

- **Vertical depth over horizontal reach.** Educational creators —
  broadly. We say no to physical goods, scheduling marketplaces,
  and *required* login systems. Optional Nostr login is in scope
  (see ADR
  [0007](../architecture/decisions/0007-optional-nostr-buyer-login.md))
  because it adds a history surface without ever blocking a sale.
- **Working in production over working in theory.** Ship what
  works on real Lightning today (pre-paid). Treat what is still
  experimental (NWC auto-renewal) as opt-in and honest.
- **Seller time over our cleverness.** Every config field that
  doesn't pull weight gets cut.
- **The protocol's evolution as a roadmap.** When Lightning grows
  new primitives, we add them as features behind flags — not as
  abstractions in v1.

## What we don't do

- Custody. Both rails route directly to the seller — Wapu's
  direct-payment puts ARS in their CBU/alias; the Lightning
  Address rail puts sats in their wallet. The platform never
  holds buyer sats or seller funds in either case. Decisions in
  ADRs
  [0002](../architecture/decisions/0002-settlement-via-wapu.md),
  [0012](../architecture/decisions/0012-multi-tenant-marketplace.md),
  and
  [0015](../architecture/decisions/0015-sats-settlement-rail.md).
- Generic e-commerce features (stock, variants, shipping,
  tax-by-destination). Decision in ADR
  [0003-educator-vertical](../architecture/decisions/0003-educator-vertical.md).
- A third settlement rail. Wapu (sats → ARS) and Lightning
  Address (direct sats) are the two options; adding a third
  needs a superseding ADR. Decision in ADR
  [0015-sats-settlement-rail](../architecture/decisions/0015-sats-settlement-rail.md),
  superseding the rail-count clause of ADR 0002.
- Email integration. The receipt page is the canonical delivery
  channel; Nostr DMs are the optional push. Decision in ADR
  [0006-nostr-and-inapp-delivery](../architecture/decisions/0006-nostr-and-inapp-delivery.md).
- *Required* buyer accounts. Anonymous purchase is always
  available — the opaque receipt URL is enough to walk away with
  the redemption code. Optional Nostr login is offered for buyers
  who want a persistent order history at `/[locale]/purchases`
  and reliable DM push without re-pasting an identifier at every
  checkout. Decision in ADR
  [0007-optional-nostr-buyer-login](../architecture/decisions/0007-optional-nostr-buyer-login.md).

## A note on the name

"Cursá" is the Argentine voseo imperative of *cursar* — "go take
a course." It reads as a friendly nudge: *go take that class.*
Pronounced *coor-SAH*, with the stress on the last syllable.

The repo and config use the unaccented form `cursa` to keep
tooling URLs and shell paths clean; the accented spelling is
reserved for product copy, the OG title, and anything a human
sees. The two forms are deliberately treated as one name with
two surfaces, not two names.
