---
status: accepted
date: 2026-02-28
decision-makers: nishyfish
---

# SQLite + Prisma for Core Persistence

## Context and Problem Statement

The bot core and built-in plugins need persistent storage. External plugins own their own data and are out of scope here. What datastore should the core use?

## Decision Drivers

- Plugins are self-contained and own their own persistence — no shared datastore needed
- The core and built-in plugins have modest data requirements (counters, leaderboards)
- Minimise infrastructure complexity for local development

## Considered Options

- SQLite (embedded, file-based)
- PostgreSQL (dedicated container)

## Decision Outcome

Chosen option: **SQLite via Prisma ORM**.

SQLite runs embedded in the bot process — no additional container required. Prisma provides type-safe database access and manages migrations. Schema lives in `src/core/prisma/schema.prisma`.

### Consequences

- Positive: No database container needed for the core; simpler docker-compose setup
- Positive: Prisma migrations are committed to the repo, keeping schema changes tracked
- Negative: SQLite is not suited for multiple concurrent writers — acceptable given single-process bot design
- Neutral: External plugins choose their own persistence strategy independently; PostgreSQL remains an option for any plugin that needs it
