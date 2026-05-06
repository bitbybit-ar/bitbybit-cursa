# BitByBit Cursá

Lightning checkout for Argentine educators. Paid in sats, settled
in pesos. Built for La Crypta Hackathon #3 (Commerce), with
**Wapu** as the sponsor and payment rail.

> Cursá tu próxima clase con sats.

Source for <https://cursa.bitbybit.com.ar>.

## What it is

A vertical OSS kit for music schools, tutors, language academies,
yoga studios, and other small educators in Argentina. Sells two
product primitives:

1. **Redeemable codes** — single class, lesson packs, monthly
   bonos. Buyer gets a code on a permanent receipt page (and an
   optional Nostr DM if they connected a pubkey at checkout) and
   shows it in person.
2. **Digital downloads** — PDFs, sheet music, recorded courses.
   Buyer gets a signed download URL on the same receipt page (and
   the optional Nostr DM).

Buyers pay over Lightning. Wapu converts the sats to ARS and
settles to the merchant's CBU or alias. No Lightning literacy
required from the merchant. No email integration — see ADR
[0006](./docs/architecture/decisions/0006-nostr-and-inapp-delivery.md).

Optional NWC-based auto-renewal can be enabled per merchant;
pre-paid one-shots are always on.

## Stack

Next.js 16 (App Router) · next-intl (es / en) · next-themes ·
SCSS modules · Vercel · Wapu API · Nostr (NIP-04/44 DMs).

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

(Setup details land with the initial scaffold.)

## Documentation

Internal documentation lives in [`docs/`](./docs/README.md):

- [Mission and product positioning](./docs/about/mission.md)
- [Architecture overview](./docs/architecture/overview.md)
- [Architecture decisions (ADRs)](./docs/architecture/decisions/)
- [Changelog](./CHANGELOG.md) (repo root)
- [Contributing + vulnerability disclosure](./CONTRIBUTING.md) (repo root)
- [Agent instructions and doc standard](./CLAUDE.md) (repo root)

The doc structure mirrors the canonical template in
[`bitbybit-ar/home`](https://github.com/bitbybit-ar/home).

## Sister projects

- [home](https://github.com/bitbybit-ar/home) — group landing at
  `bitbybit.com.ar`.
- [bitbybit-arena](https://github.com/bitbybit-ar/bitbybit-arena) —
  public Nostr challenges with badges and zaps.
- [bitbybit-habits](https://github.com/bitbybit-ar/bitbybit-habits) —
  habit tracker with Lightning rewards.

## License

Open source. See `LICENSE` (TBD).
