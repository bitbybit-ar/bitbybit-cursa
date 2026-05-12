# 0016. Collapse `merchants` into `users`

- **Date**: 2026-05-11
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-11

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-11 | — | Initial version. | The `merchants` table has been renamed to `users` to reflect ADR 0014's collapse of the buyer/merchant split. Supersedes the table-naming half of ADR 0012; URL slug parameter `[merchantSlug]` → `[userSlug]`; helpers, audit-log column, and zod schemas rename to match. |

---

## Context

ADR 0014 opened the marketplace to every signed-in user and added a
lazy-create path that materialises a `merchants` row at sign-in. After
that change, every signed-in Nostr account already has a `merchants`
row — the row is data, not a gate, and "buyer with no row" is no
longer a state we model.

That left the table name lying about what it stores. Calling the row a
"merchant" suggested it was a seller-only construct (CBU, alias,
payout method), but every signed-in user now has one whether or not
they sell anything. The buyer-side mental model — "the row keyed to
my pubkey" — is just "the user row".

## Decision

Rename `merchants` → `users` end-to-end:

- **Database**: `ALTER TABLE merchants RENAME TO users`; rename
  `merchant_id` → `user_id` on `offerings`, `orders`, and
  `admin_audit_log`; rename matching indexes, unique constraints, and
  FK constraints to the new prefix. Hand-written migration
  `0005_collapse_merchants_into_users.sql` does the pure structural
  rename. No data backfill.

- **Helpers**: `lib/admin/merchants.ts` → `lib/admin/users.ts`.
  `getMerchantByPubkey` / `getMerchantBySlug` / `getMerchantById` →
  `getUserByPubkey` / `getUserBySlug` / `getUserById`.
  `ensureMerchantForPubkey` → `ensureUserForPubkey`. `claimMerchant`
  → `claimUser`. `updateMerchantProfile` → `updateUserProfile`.
  `InitialMerchantProfile` → `InitialUserProfile`. `Merchant` type →
  `User`. `MerchantSlugSchema` → `UserSlugSchema`. `checkMerchantSlug`
  → `checkUserSlug`.

- **Panel context**: `lib/admin/require-merchant.ts` →
  `lib/admin/require-user.ts`. `requireMerchant` → `requireUser`;
  `requireUserMerchant` / `requirePanelMerchant` → `requirePanelUser`.
  The hook now returns `{ session, user }`.

- **Sessions**: `SessionMerchantSummary` → `SessionUserSummary`; the
  `/api/auth/session` payload's `merchant: …` field → `user: …`.
  Same shape (id, slug, display_name), different key.

- **Error codes**: `merchant_inactive` →  `seller_inactive`;
  `merchant_payout_missing` → `seller_payout_missing`;
  `merchant_lightning_address_missing` →
  `seller_lightning_address_missing`. The `merchant_inactive`
  framing was about the user-as-seller; the new `seller_*` prefix
  names the role the error pertains to.

- **Public URLs**: `/m/[merchantSlug]/...` → `/m/[userSlug]/...`. The
  URL path itself stays `/m/<slug>` (no break for shared links); only
  the param name is updated. `proxy.ts`'s 308 redirect table stays
  intact because legacy paths target the new English routes by URL
  string, not by param name.

- **Platform identity**: `lib/merchant.ts` → `lib/site.ts`. The
  hardcoded `MERCHANT` constant was actually the *site/brand*
  identity (name, domain, social links), conceptually unrelated to
  the per-row table. Renamed to `SITE` to remove the conflation.

- **i18n**: The `landing.flow.merchants.*` key namespace → `creators.*`;
  feature keys `merchantPanelTitle/Body` → `creatorPanelTitle/Body`;
  `merchantPayoutQ/A` (FAQ) → `creatorPayoutQ/A`. User-visible Spanish
  copy continues to say "profe"; English flips "merchant" → "creator"
  where it appeared.

- **Tests**: `seedMerchant` → `seedUser` in the integration setup;
  every test that asserted on `merchant_id` updated to `user_id`;
  `tests/unit/lib/admin/merchants.test.ts` → `users.test.ts`.

## Consequences

- **Schema migration is structural-only.** No data backfill, no
  application-layer compatibility shims. Existing rows are renamed in
  place; their FKs and indexes are renamed atomically alongside.

- **One PR, one migration.** Reverting the rename means rolling back
  `0005_collapse_merchants_into_users.sql` and the code together. The
  ALTER statements are reversible (rename back), so a rollback is
  possible if a downstream consumer breaks, but no rollback migration
  ships in this commit — the change is small enough that fix-forward
  is the expected response.

- **ADR pointers**: this ADR supersedes the table-naming half of ADR
  0012. ADR 0012's per-tenant model + ADR 0014's lazy-create flow are
  unchanged; only the column/table/file names move. ADR 0015 (sats
  settlement rail) continues to attach `payout_method` +
  `lightning_address` to the renamed `users` row.

- **No buyer-side impact.** Buyers never saw the word "merchant" in
  the UI; the rename is internal naming + URL param name. Shared
  storefront URLs (`/m/<slug>`) continue to work.

## Status

Accepted 2026-05-11. Rename applied in
`feat/collapse-merchants-into-users` (PR forthcoming). Supersedes the
table-naming clause of ADR 0012.
