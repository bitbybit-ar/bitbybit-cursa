# Nostr-reactions reputation for highlighted courses

> **Status:** Draft
> **Last updated:** 2026-05-08

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-08 | — | Initial version. | Capture the idea for a Nostr-reactions-based reputation source so the v1 mocked "highlighted courses" can be replaced with real signal once we have it. |

---

## The idea

Cursá's home page renders a "highlighted courses" section that
today sources from `lib/mock/highlighted-courses.ts`. Once
offerings are published as kind:30402 (or our chosen marketplace
event kind) Nostr events, we can rank them by the reactions
(kind:7) they receive on relays.

Sketch of the pipeline:

1. When a merchant publishes an offering through the panel,
   broadcast a kind:30402 event whose `d` tag is the offering
   slug, `image` tag carries `image_url`, and `price` tag
   carries the ARS amount.
2. A daily (or hourly) job queries a configured relay set for
   kind:7 reactions on those event ids, with a NIP-07 web-of-
   trust filter applied so a single bot farm can't dominate the
   ranking.
3. Score each offering: `weighted_reactions / sqrt(age_in_days)`
   so newer-but-loved offerings can climb past older-but-stale
   ones.
4. Cache the top-N ids in a Postgres `highlighted_offerings`
   table or a redis equivalent. The home page reads from that
   cache, not the relays directly.

## Why we want this

- The home page should reflect what the community actually
  values, not what the platform team picked.
- It's open: any client can compute the same ranking from the
  same public events, so we can't quietly "weight our friends".
- It rewards merchants for building Nostr presence (not just
  putting up offerings and disappearing).

## Open questions

- Which kind for the offering events? `30402` (NIP-99 classified
  listings) is the obvious candidate; we could also define our
  own kind and document it.
- Which relay set ships as the default? La Crypta's relay
  is the natural anchor; we'd want at least 2–3 more for
  redundancy.
- How do we handle deletion? Kind:5 deletes need to drop the
  offering from the highlighted set on the next refresh.
- WoT trust scoring: do we use the merchant's own follow set
  as the anchor, or the platform's? Per-merchant feels more
  natural but exposes us to merchants gaming their own follows.

## Why this is "later"

We need real merchants and real offerings for the ranking to
matter. While we're at zero merchants the mocked entries do
the job: communicate intent and surface shape. The migration
from mocks to real data is one component swap (`lib/mock/...`
→ `lib/highlighted/...`), so we're not painting ourselves into
a corner by shipping mocks now.
