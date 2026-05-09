# 0013. Public landing page; marketplace grid moves to /explorar

- **Date**: 2026-05-08
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-08

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-08 | — | Initial version. | The locale root needed a real entry point — the bare marketplace grid was reading as a backend tool, not a product. We moved the grid to /explorar and made the home a proper landing. |

---

## Context

After ADR 0012's marketplace pivot, the locale root
(`app/[locale]/page.tsx`) showed a one-line hero plus a grid of
every active offering. That worked while we had zero merchants and
needed the page to do *something*, but it stopped reading as a
landing page the moment the marketplace had real content. First-
time visitors landed on a list of strangers' courses with no
introduction, no pitch, no path forward, and no way to reach the
sister projects (Arena, Habits) that motivated the platform.

We also had no global navigation. The only persistent UI element
across the app was a fixed `LanguageToggle` in the corner; a
buyer who reached the catalog had no way to sign in, browse the
brand, or step back to a marketing surface — the catalog *was*
the marketing surface.

## Decision

Three coupled changes:

1. **Replace `/[locale]` with a landing composition.** The home
   page now renders, in order: `Hero` (animated gradient on
   "sats", floating bubbles with course-themed icons, two CTAs),
   `HighlightedCourses` (mocked for v1), `NeedMotivation` (Arena
   + Habits polaroids), `TravelCompanions` (Wapu, La Crypta,
   LaWallet), and `SupportBitByBit`. No marketplace grid on `/`.

2. **Move the marketplace grid to `/[locale]/explorar`.** The
   discovery feed (`listDiscoveryOfferings()`) now lives at
   `/explorar`; the hero CTA, the highlighted-courses "Explore
   more" link, and the navbar "Explorar cursos" anchor all land
   there. The route is `force-dynamic` because the data
   changes every time a merchant publishes; the home stays
   static-friendly.

3. **Navbar and Footer become global layout fixtures.** Both
   mount inside `app/[locale]/layout.tsx`, replacing the
   floating `LanguageToggle`. The navbar handles theme + locale
   toggles, login, and (when signed in) an account dropdown
   with "Mis compras" / "Panel" / "Cerrar sesión".

## Consequences

**Positive.**

- The locale root finally answers "what is this?" before showing
  what's for sale.
- Sister projects (Arena, Habits) get a real surface from which
  to acquire users — they were invisible before.
- The marketplace grid keeps working without behavioral changes;
  it just moved one route deeper.
- Global Navbar and Footer give every page (catalog, checkout,
  panel) consistent navigation.

**Negative / accepted trade-offs.**

- **Highlighted courses are mocked.** Real "highlighted" status
  needs a reputation source (see `docs/ideas/nostr-reputation.md`
  for the planned Nostr-reactions approach). Until then, the
  three cards live in `lib/mock/highlighted-courses.ts` and
  point at non-existent merchants — clicking through 404s. We
  accepted this for v1 because the section communicates intent
  and shape; production will swap mocks for a query.
- **Internal links no longer dominate the home.** Buyers who
  bookmarked `/` to reach the marketplace need one extra click.
  We chose this trade-off knowing buyers who came back are not
  the audience the landing serves; new visitors are.
- **The Wapu logo ships as a placeholder SVG** at
  `public/images/companions/wapu.svg`. Replace with the real
  brand asset once Wapu provides one.

## What this does not change

- ADR 0012's marketplace model (storefronts at `/m/[slug]`,
  offerings at `/m/[slug]/c/[slug]`).
- ADR 0008's panel auth posture (still `/[locale]/panel/*`,
  still merchant-gated, still 404 for non-merchants).
- ADR 0002's settlement model (still Wapu-only).
- The auth surface (`/[locale]/iniciar-sesion`) — the navbar
  login button just links to it.

## Future work

- Replace mocked highlighted courses with a Nostr-reactions
  reputation query (see `docs/ideas/nostr-reputation.md`).
- Build merchant profile pages with the Arena-style header and
  customizable badge circles (see `docs/ideas/professor-profiles.md`).
- Populate the `/faq` placeholder with real content once we know
  which questions buyers and merchants actually ask.
