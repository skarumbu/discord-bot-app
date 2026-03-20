---
status: accepted
date: 2026-03-19
decision-makers: nishyfish
---

# Azure Table Storage for Karma Persistence

## Context and Problem Statement

The `/karma` plugin needs a persistent store for per-guild, per-user karma scores. The data model is a simple key-value map (`(guildId, userId) → score`) with leaderboard queries. What storage backend should karma use?

## Decision Drivers

- Karma scores must survive container restarts and redeployments
- The bot runs in Azure Container Apps — the container filesystem is ephemeral
- No additional infrastructure should be required at development time beyond what already exists
- Cost should be near-zero at a small friend-group server scale

## Considered Options

- SQLite via Prisma (embedded file-based, as specified in ADR 0004)
- Azure Table Storage (managed cloud service, already in the project's Azure subscription)

## Decision Outcome

Chosen option: **Azure Table Storage**.

SQLite is ruled out because the container filesystem is ephemeral — data written to disk is lost on every redeploy. A volume mount could work, but Azure Container Apps does not provide a simple persistent volume solution; it would require Azure Files, adding cost and complexity that outweighs the benefit of using SQLite.

Azure Table Storage fits naturally: it is a managed, serverless key-value store with no server to run or maintain, and it is free at the access volumes a private Discord server generates. The `(guildId, userId)` primary key maps directly to `(PartitionKey, RowKey)`. Leaderboard queries use a partition-scoped filter, which Table Storage handles efficiently.

The connection string is provisioned by Terraform and injected into the container as the `KARMA_STORAGE_CONNECTION_STRING` secret environment variable — no manual setup is required at deploy time.

### Consequences

- Positive: Karma persists across deploys and container restarts with no extra infrastructure
- Positive: No server to manage; Table Storage scales automatically
- Positive: `(PartitionKey, RowKey)` maps cleanly to `(guildId, userId)` — the data model is a natural fit
- Negative: Local development requires either a real Azure storage account or the Azurite emulator (`KARMA_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true`)
- Neutral: ADR 0004 (SQLite + Prisma) remains the intended approach for any future core/plugin storage that does not require cloud persistence; this decision applies specifically to karma
