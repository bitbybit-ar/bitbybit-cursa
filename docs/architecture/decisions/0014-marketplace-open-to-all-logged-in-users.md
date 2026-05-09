# 0014. Open the marketplace to every logged-in user

- **Date**: 2026-05-09
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-09

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-09 | — | Initial version. | The merchant-only `/panel/*` surface has been replaced with first-class top-level routes. Every signed-in Nostr user is implicitly a creator now; the merchant row is data, not a gate. |

---

## Context

ADR 0008 carved out a `/panel/*` namespace gated by `ADMIN_PUBKEYS`
plus a claimed `merchants` row. ADR 0012 turned that gate into the
multi-tenant marketplace surface. Both ADRs assumed two distinct user
classes: buyers (no merchant row, see only `/mis-compras`) and
merchants (have a merchant row, see the full panel).

That distinction has aged out of the product. Two pressures:

1. **Onboarding friction.** Asking every potential creator to claim a
   slug + display name + payout details before they can even see the
   create-a-course form turned out to be a hard sell. Most signed-in
   users want to create first and configure payouts later.
2. **Information architecture.** The split menu ("My purchases" for
   buyers, "Panel" for merchants) leaks an internal boundary into the
   navbar. The user just wants one account menu with everything they
   own — purchases, courses they sell, settings.

Wapu's direct-payment posture has not changed: every settlement still
routes from buyer Lightning to seller CBU/alias with no platform
custody (ADR 0002, 0012). The merchant row keeps existing as the
foreign-key target for offerings + orders. What changes is who gets
one and when.

## Decision

Any signed-in Nostr user is implicitly a creator. The merchant row is
auto-created with placeholder values on first server-side need
(`ensureMerchantForPubkey`); the user can rename their slug and fill
in CBU/alias later from `/configuracion`.

Concretely:

- The `/panel/*` namespace is gone. The four surfaces it housed move
  to top-level routes:
  - `/panel/ofertas` → `/mis-cursos`
  - `/panel/configuracion` → `/configuracion`
  - `/panel/pedidos` → `/mis-ventas`
  - `/panel/estudiantes` → `/mis-estudiantes`
  Legacy URLs 308-redirect via `proxy.ts`.
- The panel layout's sidebar is dismantled. Each new page renders
  inside the global navbar, with a shared account dropdown
  (Avatar → My purchases / My courses / Settings / Sign out).
- Edge gating: the new routes require a signed-in session
  (`proxy.ts` redirects to `/iniciar-sesion?next=...`). They do
  **not** require an existing merchant row — `requireUserMerchant`
  in `lib/admin/panel-context.ts` (and `requireMerchant` for API
  routes) lazily creates one keyed by pubkey.
- `/onboarding` is no longer a forced step. It survives as the
  "claim a custom slug now" entry point but is reachable only from
  explicit prompts; users who land on `/mis-cursos` first get a
  placeholder slug (`user-<first-8-of-pubkey>`) they can rename.
- The platform-admin posture (`PLATFORM_ADMIN_PUBKEYS`) is unchanged:
  inactive merchants still 404; moderation lives elsewhere.

## Consequences

### Positive

- One unified menu across the navbar, mobile drawer, and account
  surfaces — no more buyer/merchant branching in the UI.
- "Create your first course" is a one-click flow from the navbar; no
  forced slug-pick gate.
- Bookmarks and external links to `/panel/*` still work via the 308
  redirects.

### Negative

- Every signed-in user creates a merchant row on first creator-page
  visit, even if they never publish anything. The placeholder rows
  are cheap (~200 bytes), but `merchants` will accrue more rows than
  there are active sellers.
- Slugs derived from pubkeys (`user-<first-8>`) are not pretty. Users
  who care must rename before sharing their storefront link.
- Re-introducing a "merchant-only" gate later requires deciding what
  signal flips someone from placeholder to active creator — not
  worth solving until we have product evidence we need it.

### Neutral

- The `merchants.active` flag still exists as the moderation gate.
- Schema unchanged except for the new `notifications` table (separate
  scope but landed in the same PR).

## Alternatives considered

- **Forced onboarding** — keep `/onboarding` as a hard gate before
  any creator surface. Rejected: that's the friction this ADR is
  removing.
- **Dual menus** — keep a buyer/merchant split in the navbar. Rejected:
  it bakes the legacy distinction into the UI we just simplified.
- **Per-page gates that reject without a merchant row** — let pages
  return a "you need to claim a slug first" state. Rejected: forces
  onboarding back into the flow with extra steps and no upside.

## References

- Supersedes ADR 0008 (merchant-admin-dashboard) — the panel surface
  it pinned no longer exists.
- Supersedes ADR 0012 (multi-tenant-marketplace) — the per-merchant
  ownership model survives, but the access model it implied does
  not.
- ADR 0010 (no-yaml-config) is unaffected.
- ADR 0007 (anonymous buyers stay anonymous) is unaffected — buyers
  who never sign in still don't get a merchant row.
