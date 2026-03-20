---
status: accepted
date: 2026-02-28
decision-makers: nishyfish
---

# discord.js v14 as Discord API Client

## Context and Problem Statement

The bot core needs a library to interface with the Discord API (slash command registration, gateway connection, interaction handling). Which library should be used?

## Decision Drivers

- TypeScript support
- Slash command and interaction support (Discord API v10+)
- Community size — contributors may need to look things up
- Should not constrain the bot's own command routing architecture

## Considered Options

- discord.js v14
- Discordeno
- Sapphire Framework (built on discord.js)

## Decision Outcome

Chosen option: **discord.js v14**, used as a thin Discord API client only.

discord.js handles slash command registration and the Discord gateway. Its opinionated command handler conventions are deliberately not adopted — the bot uses its own plugin registry and command router. discord.js is infrastructure, not architecture.

### Consequences

- Positive: Largest community and documentation ecosystem
- Positive: Native TypeScript types, first-class slash command and interaction support
- Neutral: Sapphire was considered but its command-loading system conflicts with our plugin registry
- Neutral: Discordeno is more modern but has a smaller community — a disadvantage for a multi-contributor project
