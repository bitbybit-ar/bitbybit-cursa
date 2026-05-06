# 0001. Record architecture decisions

- **Date**: 2026-05-05
- **Status**: Accepted
- **Deciders**: BitByBit team
- **Last updated**: 2026-05-05

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-05 | — | Initial version. | First decision recorded — establishes the ADR practice for this repo. |

---

## Context

Across our projects we have made design decisions repeatedly without
recording them, which means each new contributor has to rediscover
the reasoning by reading commits or asking. The same questions come
back ("why this and not that?") and we answer them from memory,
sometimes inconsistently.

## Decision

We will record significant architecture decisions as
**Architecture Decision Records (ADRs)** in
`docs/architecture/decisions/`, one decision per file, numbered
sequentially.

The format is the template at
`docs/architecture/decisions/template.md`, adapted from Michael
Nygard's classic ADR.

A decision is "significant" if changing it later would require
touching multiple files, retraining the team, or coordinating a
migration.

## Consequences

### Positive

- New contributors can read the decisions instead of asking around.
- Decisions become reviewable artifacts in PRs.
- We notice when we are about to overturn a prior decision, and can
  supersede it explicitly instead of drifting.

### Negative

- Writing an ADR takes time. We accept this cost.

### Neutral

- ADRs are append-only. Old ADRs that are no longer the current
  truth are marked **Superseded by [NNNN]** rather than deleted.

## Alternatives considered

- **Decisions tracked only in commit messages**: rejected because
  they are hard to find and they mix decision context with
  implementation details.
- **Decisions in a wiki**: rejected because the wiki drifts from the
  code, and PRs cannot easily reference wiki versions.

## References

- <https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions>
- <https://adr.github.io/>
