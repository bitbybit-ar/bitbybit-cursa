# Mission

> **Status:** Active
> **Last updated:** 2026-05-08

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-08 | Body, What we value, What we don't do | Pivoted from single-tenant tool to multi-tenant marketplace per ADR 0012. Onboarding is now "sign in with Nostr, claim a slug, paste your CBU/alias", not "developer forks the repo." Wapu direct-payment routes ARS straight to each merchant; the platform never custodies. | The single-tenant model required a developer per merchant — unsustainable for the educator audience. Wapu's direct-payment API removed the only blocker against per-invoice merchant routing. |
| 2026-05-06 | Body, What we value, What we don't do | Reframed the merchant onboarding model from "edits a config file" to "developer forks once, merchant runs everything from the dashboard." Added the panel to the value bullets and noted that catalog/CBU/autorenewal now live in Postgres, edited via `/panel`. Cross-linked ADRs 0008, 0009, 0010. | ADRs 0008–0010 dismantled `merchant.yaml` and moved operational state into Postgres + the panel. The mission still claimed merchants edit a config file, which is now false and would mislead any new contributor reading this first. |
| 2026-05-06 | What we value, What we don't do | Softened "no buyer accounts" to "no *required* buyer accounts" and noted that optional Nostr login is now in scope. Cross-linked to ADR 0007. | ADR 0007 introduces optional Nostr login for buyers (history view + reliable DM push) without breaking the anonymous-purchase floor; the mission must reflect that distinction or it reads as a contradiction. |
| 2026-05-06 | Body, What we don't do, A note on the name | Reframed delivery from email to in-app receipt + optional Nostr DM, consistent with ADR 0006. Added "A note on the name" section explaining the voseo origin. | Email is no longer part of the architecture (ADR 0006), and the meaning of "Cursá" was sitting only in conversation memory, not in the repo. |
| 2026-05-05 | — | Initial version. | Pin the project's reason for existing before any code lands. |

---

BitByBit Cursá exists so a piano teacher in Buenos Aires can
accept Bitcoin without learning what Lightning is, and receive
pesos in her bank the same day.

The Argentine educator long tail — music schools, tutors, language
academies, yoga studios, code bootcamps — has been underserved by
existing payment tooling. Card processors take a cut and demand
paperwork. Direct bank transfers leak through buyer-side friction.
Sats-only solutions assume buyers and merchants are crypto-literate.

Cursá takes the opposite stance: **buyers pay in sats, merchants
think in pesos, and the protocol gets out of the way.**

A professor signs in with her Nostr key, claims a slug, pastes
her CBU or alias, and is selling within minutes — no fork, no
Vercel project, no env wiring. Her store lives at
`cursa.bitbybit.com.ar/m/<her-slug>`. The buyer scans a QR;
Wapu's direct-payment routes the ARS straight to the
professor's CBU. The platform never custodies funds. A permanent
in-app receipt page delivers the redemption code or download URL;
if the buyer connected a Nostr identity at checkout, the same
content also arrives as an encrypted DM in their Nostr client.

Sovereignty is preserved as the *self-hosting* path: any
merchant who wants their own deployment can fork the repo and
run a single-tenant Cursá against their own Wapu account. The
hosted marketplace at `cursa.bitbybit.com.ar` is just the
default; the architecture supports either.

We are not building a generic storefront — every other team will.
We are building the smallest possible payments toolkit for one
specific audience that genuinely benefits from sats-in / pesos-out.

## What we value

- **Vertical depth over horizontal reach.** Educators only. We say
  no to physical goods, scheduling marketplaces, and *required*
  login systems. Optional Nostr login is in scope (see ADR
  [0007](../architecture/decisions/0007-optional-nostr-buyer-login.md))
  because it adds a history surface without ever blocking a sale.
- **Working in production over working in theory.** Ship what
  works on real Lightning today (pre-paid). Treat what is still
  experimental (NWC auto-renewal) as opt-in and honest.
- **Merchant time over our cleverness.** Every config field that
  doesn't pull weight gets cut.
- **The protocol's evolution as a roadmap.** When Lightning grows
  new primitives, we add them as features behind flags — not as
  abstractions in v1.

## What we don't do

- Custody. Wapu's direct-payment routes ARS to the merchant's
  CBU/alias on every settlement; the platform never holds buyer
  sats or merchant pesos. Decisions in ADRs
  [0002](../architecture/decisions/0002-settlement-via-wapu.md)
  and
  [0012](../architecture/decisions/0012-multi-tenant-marketplace.md).
- Generic e-commerce features (stock, variants, shipping,
  tax-by-destination). Decision in ADR
  [0003-educator-vertical](../architecture/decisions/0003-educator-vertical.md).
- A second settlement rail in v1. Decision in ADR
  [0002-settlement-via-wapu](../architecture/decisions/0002-settlement-via-wapu.md).
- Email integration. The receipt page is the canonical delivery
  channel; Nostr DMs are the optional push. Decision in ADR
  [0006-nostr-and-inapp-delivery](../architecture/decisions/0006-nostr-and-inapp-delivery.md).
- *Required* buyer accounts. Anonymous purchase is always
  available — the opaque receipt URL is enough to walk away with
  the redemption code. Optional Nostr login is offered for buyers
  who want a persistent order history at `/[locale]/mis-compras`
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
