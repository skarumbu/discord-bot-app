---
status: accepted
date: 2026-02-28
decision-makers: nishyfish
---

# TypeScript for the Bot Core

## Context and Problem Statement

The Discord transport layer and plugin registry need a primary implementation language. Plugins may be written in any language, but the core must be maintained by the primary contributors.

## Decision Drivers

- Primary contributor preference and existing familiarity
- Strong typing for the plugin contract and registry reduces integration errors
- Large ecosystem for Discord bot development

## Decision Outcome

Chosen option: **TypeScript (Node.js)**.

The bot core (`src/core/`), built-in plugins (`src/plugins/`), and adapter implementations (`src/adapters/`) are written in TypeScript. External plugins are language-agnostic.

### Consequences

- Positive: Strong typing on `CommandContext` and `PluginResponse` catches contract mismatches at compile time
- Positive: discord.js — the most mature Discord library — is TypeScript-native
- Neutral: Only the core needs TypeScript; plugin contributors use whatever language they prefer
