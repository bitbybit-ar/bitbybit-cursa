# 0011. Store offering images on Blossom servers

- **Date**: 2026-05-08
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-08

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-08 | — | Initial version. | Pin the image-storage strategy before the offering-form upload UI lands so the choice does not get retrofitted under deadline pressure, and so `image_url` rows do not get locked to a provider we wanted to avoid. |

---

## Context

Offering rows in Postgres carry an `image_url: text | null` field
(ADR [0009](0009-offerings-and-settings-in-database.md)). The merchant
panel renders that value through `next/image` at the catalog detail
page (`/[locale]/c/[slug]`) and listing card. The form at
`/[locale]/panel/ofertas/{nueva,[slug]/editar}` currently exposes
`image_url` as a plain text paste-box: the merchant types or pastes
a URL they have hosted somewhere else.

`@vercel/blob` is in `package.json` and `docs/architecture/routing.md`
mentions an `/api/admin/upload` route, but no upload code has been
written yet. We have not paid Vercel for storage. This ADR pins what
we do *next*, not what we are unwinding.

The audience is Argentinean educators. The repo deploys as a
single-tenant store per merchant (ADR
[0004](0004-static-config-deployment.md)). The merchant logs in with
their Nostr identity and already signs both the NIP-98 login event
and — as of the merchant-admin chunk — a NIP-98 re-sign on
payment-destination changes via `signWithPrompt`
(ADR [0008](0008-merchant-admin-dashboard.md), implementation row
2026-05-08). So the project already has all the signer machinery a
Nostr-authenticated upload protocol needs.

The forces at play:

- **Cost.** Vercel Blob is paid storage (~$0.023/GB stored plus
  bandwidth). Trivial in absolute terms for a small storefront,
  but every bit of fixed cost reduces the chance a teacher will
  keep a deployment running between course launches.
- **Architectural coherence.** Auth is Nostr. Delivery is Nostr DMs
  + in-app receipts (ADR
  [0006](0006-nostr-and-inapp-delivery.md)). A non-Nostr storage
  layer for a single field reads as a premature dependency.
- **Migration cost.** Every `image_url` row written under one
  provider locks us to that provider unless we re-host. Choosing
  late is more expensive than choosing now.
- **Durability.** Free public servers can disappear. Paid
  storage survives until the bill stops.

## Decision

Upload offering images directly from the browser to one or more
Blossom servers (https://github.com/hzrd149/blossom), authenticated
by a kind:24242 signed event produced via `signWithPrompt`. Persist
the resulting hash-addressed URL (`https://server/<sha256>.<ext>`)
into `offerings.image_url`. No server-side proxy.

Concrete shape:

- A new `lib/blossom/client.ts` helper takes a `File`, computes its
  sha256, builds + signs the kind:24242 event, and PUTs the bytes
  to every server in the configured list in parallel. It resolves
  on the first success and surfaces partial failures so the UI can
  show "uploaded to N of M mirrors".
- A new `components/admin/image-upload/` client component renders
  a file picker + paste-URL fallback. The paste fallback survives
  so a merchant who already self-hosts is not forced through
  Blossom.
- The configured server list lives in env var `BLOSSOM_SERVERS`
  as a comma-separated list. The defaults shipped in
  `.env.example` are `https://blossom.primal.net` and
  `https://cdn.satellite.earth` — two stable, free, public
  servers that cover each other on outage.
- `@vercel/blob` is dropped from `package.json`. The
  `/api/admin/upload` row is removed from
  `docs/architecture/routing.md`. There is no server-side upload
  route.

## Consequences

### Positive

- Zero recurring storage cost for v1.
- One codepath for "things the merchant signs": every signed
  action — login, settings re-sign, image upload — flows through
  `signWithPrompt`.
- Hash-addressed URLs are inherently cacheable forever and can be
  re-served by any Blossom-compatible mirror, so a server outage
  does not necessarily mean a broken image.
- No new server route to defend against abuse: there is no
  `/api/admin/upload` to rate-limit, audit, or scan.

### Negative

- Image durability depends on a third party we do not control.
  Mitigation: mirror to two servers by default, store the sha256
  alongside the URL, and accept that we may need to add a
  fallback-server render path later if the primary disappears.
- A Blossom server can refuse to serve a particular blob
  (moderation). Mitigation: same as above — the merchant can
  re-publish the same bytes to a different server and update
  the row.
- Direct browser upload exposes the merchant's pubkey to the
  Blossom server's access log. Acceptable: their pubkey is
  already public on Nostr.
- We give up the "merchant typed a URL we never validated" UX
  for the happy path; on the upload path we now own size + type
  validation.

### Neutral

- Switching providers later is migration work (re-upload all
  existing blobs, rewrite `image_url` rows). Same as if we had
  picked Vercel Blob — provider lock-in is the default story for
  any blob storage choice.
- The test suite gains a unit test for the Blossom client (`fetch`
  mocked, signer stubbed). No integration tests against real
  Blossom servers.

## Alternatives considered

- **Vercel Blob.** Rejected primarily on the cost-coherence
  trade-off described in Context. It would have been the simplest
  default — a single-vendor managed service with a typed SDK
  already present in `package.json` — and we keep the option
  open by *not* persisting any Blossom-specific column shape;
  `image_url` stays a plain string. If we ever switch, the
  merchant re-uploads their images and the column shape is the
  same.
- **NIP-96 file storage** (e.g. nostr.build). Rejected as
  heavier than necessary: NIP-96 carries file metadata as Nostr
  events (kind:1063), which would couple the offering catalog to
  a Nostr feed we have no other reason to write to. Blossom's
  HTTP-only profile keeps the dependency surface narrower.
- **Self-host a Blossom server.** Deferred, not rejected. A
  single-tenant deployment running its own Blossom server
  alongside the Next.js app is the obvious sovereignty story.
  Out of scope for v1 because we are still optimizing for "fork,
  set env, deploy" friction. A future merchant who wants
  sovereignty just changes `BLOSSOM_SERVERS`.
- **Stay on the paste-box.** Rejected because every educator
  who is not already a Nostr power user will paste an Imgur or
  Drive URL whose CDN configuration is outside our control;
  next/image render reliability suffers, and the merchant has
  no clear "right answer" for where to host.

## References

- Blossom protocol: https://github.com/hzrd149/blossom
- BUDs (Blossom Upgrade Documents): the kind:24242 auth-event
  shape, the `PUT /upload` and `GET /<sha256>` endpoints, and
  the optional `t`/`x`/`expiration`/`size`/`type` tags.
- ADR [0008](0008-merchant-admin-dashboard.md) — `signWithPrompt`
  is the implementation surface this builds on.
- ADR [0009](0009-offerings-and-settings-in-database.md) — pins
  `offerings.image_url` as the persisted shape.
- Implementation plan:
  `~/.claude-personal/plans/blossom-image-upload.md`.
