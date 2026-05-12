# Documentation

> **Status:** Active
> **Last updated:** 2026-05-12

---

## Change Log

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-12 | What this folder is, Structure | Rebranded "BitByBit Cursá" to "BitByBit Cursats" throughout. | Brand rename per ADR 0018 — portmanteau of *cursá* (the voseo verb) and *sats*. |
| 2026-05-05 | — | Initial version. | Bootstrap the docs tree using the canonical template from the `home` repo. |

---

## What this folder is

Internal documentation for BitByBit Cursats — the project, its
architecture, and the decisions behind it. The structure mirrors the
canonical template defined in the `home` repo
(`bitbybit-ar/home/docs/`); see that repo's `docs/README.md` for the
authoritative explanation of every section.

## Structure

```
docs/
├── README.md                 ← you are here
├── _template.md              ← copy this for new docs
├── about/
│   └── mission.md            ← what Cursats is, who it's for, why
└── architecture/
    ├── overview.md           ← system shape + key invariants
    └── decisions/            ← Architecture Decision Records (ADRs)
        ├── 0001-record-architecture-decisions.md
        ├── 0002-settlement-via-wapu.md
        ├── 0003-educator-vertical.md
        ├── 0004-static-config-deployment.md
        ├── 0005-prepaid-default-autorenewal-optin.md
        └── template.md       ← copy this for new ADRs
```

`CHANGELOG.md` (project release log) and `CONTRIBUTING.md`
(contribution + vulnerability disclosure) live at the **repo root**,
not here. Per-doc edits are recorded inside each doc.

The following standard sub-folders from the canonical template are
not yet populated; they will be added as needs arise:

- `docs/guides/` — getting started, development, deployment.
- `docs/runbooks/` — incident response procedures.
- `docs/reference/` — glossary, FAQ, API surface.
- `docs/architecture/diagrams/` — Mermaid sources.

## Doc standard

Every file in this folder carries an inline header. The full standard
is in `CLAUDE.md` at the repo root; the short version:

1. Title (`# ...`).
2. Quoted block with `**Status:**` and `**Last updated:**` (ISO date).
3. `---` separator.
4. `## Change Log` table — newest row at the top, columns
   `Date | Section | Change | Reason`.
5. `---` separator.
6. `## Table of Contents` — only when the doc has 5+ sections or is
   longer than ~150 lines.
7. Body.

Specialized templates (ADRs, runbooks) keep their own additional
header fields but still carry an inline `## Change Log`.

## Doc style

- **Sentence case** for headings.
- **Second person** ("you run") in guides and runbooks.
- **Imperative mood** for runbook steps.
- **Descriptive link text** — never "click here".
- **No emoji** unless explicitly requested.
- **Code blocks always tagged** with the language.
- **Date format**: ISO 8601 (`YYYY-MM-DD`).
- **Hard wrap** Markdown at ~80 columns.

## What to write in each doc

| File | Purpose |
|---|---|
| Root `CHANGELOG.md` | Every product-level change, grouped by release |
| Root `CONTRIBUTING.md` | How to contribute + vulnerability disclosure |
| `about/mission.md` | What the project is, who it's for, why it exists |
| `architecture/overview.md` | System shape + key invariants |
| `architecture/decisions/NNNN-*.md` | One decision per file, frozen once accepted |
| `guides/*.md` | Tutorials and how-tos for contributors |
| `runbooks/*.md` | Step-by-step recovery procedures for incidents |
| `reference/*.md` | Lookup material — glossary, FAQ, API surface |

When in doubt, ask: "If I joined this project tomorrow, which file
would hold this answer?" Put it there.
