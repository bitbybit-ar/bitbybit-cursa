## 0020. Defer auto-renewal from the MVP

- **Date**: 2026-05-14
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-14

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-14 | — | Initial version. | Record that the autorenewal toggle is gone from MVP scope before the settings refresh ships, so a future contributor can find the decision next to the code change instead of digging through commit messages. |

---

## Context

ADR [0005](0005-prepaid-default-autorenewal-optin.md) introduced
**auto-renewal** as an opt-in feature gated by the
`users.features_autorenewal` runtime flag (per ADR 0009's "settings
in Postgres" move). The settings page exposed the toggle; the
checkout was supposed to render an additional auto-renewal CTA when
the seller had it on; the NWC client + cron handler + encrypted-
secrets storage were "deployed but dormant" until a seller flipped
it on.

In practice none of that wiring was finished by the time the
broader scope of cursats MVP solidified:

- No NWC client implementation landed.
- No cron worker for the renewal sweep exists.
- No encrypted-secrets storage was implemented.
- The checkout's "second button" was never wired — both branches
  of the buy CTA pointed at the same one-shot flow.
- Sellers reading the toggle had no way to know it didn't do
  anything; flipping it changed the row but nothing else.

The hackathon brief is one-shot Lightning purchases for educational
content. Subscriptions and renewals don't appear anywhere in the
buyer or seller journey we're shipping. Carrying a dormant toggle
that mis-promises a feature is worse than not showing it at all.

## Decision

**Drop the autorenewal toggle from the v1 UI.** Specifically:

1. The settings form no longer renders the `features_autorenewal`
   checkbox. The legend group it lived under ("Funciones") goes
   away too.
2. The form no longer sends `features_autorenewal` in the PATCH
   payload to `/api/settings`.
3. The PATCH route's response no longer echoes the flag back.

**Keep the column.** `users.features_autorenewal` stays in the
database with its current default (`false`) for every row. There
is no migration to drop it because:

- The cost is one nullable boolean. Dropping the column requires
  a destructive migration and would force every downstream test
  fixture to drop the field too, for no functional gain.
- A future ADR that re-introduces autorenewal can re-surface the
  same flag without a migration, picking up where this left off.

**Keep `UpdateUserProfileSchema.features_autorenewal` as an
optional, partial field.** API clients (e.g. a hypothetical CLI
tool, or a legacy integration tester) can still set it; the form
just doesn't send it. The flag never causes behavior in the
checkout or cron paths because none of that code exists.

## Consequences

**Positive:**

- The settings page stops promising a feature that doesn't work.
- One fewer surface for sellers to misconfigure.
- The next contributor reading the codebase finds an explicit
  "deferred, not in MVP" decision instead of half-wired code with
  unclear status.

**Negative / accepted trade-offs:**

- **Column stays.** A future ADR that re-enables autorenewal will
  inherit a `false` default for every existing row. That's the
  intended migration story; flagged here so a reader doesn't
  expect the column to be gone.
- **i18n strings removed.** `settings.form.autorenewal*` and
  `settings.form.featuresLegend` are gone from
  `messages/{es,en}.json`. Re-introducing the feature means
  re-adding those (or new) keys.
- **CHANGELOG note required.** This is user-facing — the
  settings page lost a control between releases. Documented in
  the Unreleased section.

**Out of scope:**

- Removing the column itself. Tracked above as "future ADR".
- Removing `lib/checkout` or webhook code that branches on the
  flag — there isn't any. The flag was dormant; removing the
  toggle removes the only place it was read.
- Subscription-style payment plumbing in general. v1 is one-shot
  Lightning purchases only.

## Supersedes

- The autorenewal half of ADR
  [0005](0005-prepaid-default-autorenewal-optin.md). The
  pre-paid one-shot model from that ADR is the only payment
  posture we ship.
