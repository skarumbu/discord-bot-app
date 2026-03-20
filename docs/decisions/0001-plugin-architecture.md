---
status: accepted
date: 2026-02-28
decision-makers: nishyfish
---

# Plugin Architecture

## Context and Problem Statement

The bot needs to support features written in different languages by different contributors. How do we structure the bot so that Discord handling is isolated from business logic, and new features can be added without modifying the core?

## Decision Drivers

- Contributors should be able to write plugins in any language
- The Discord transport layer should be isolated from business logic
- Plugins should be self-contained (own their logic, data, and persistence)
- The system should support multiple invocation styles (in-process, HTTP, subprocess)

## Considered Options

- Plugin registry with pluggable transport adapters
- Event bus (Redis pub/sub) — all plugins subscribe to a shared message broker
- Subprocess-only — every plugin is a CLI binary invoked via stdin/stdout

## Decision Outcome

Chosen option: **Plugin registry with pluggable transport adapters**.

The bot maintains a registry of plugins. Each plugin declares which transport adapter it uses (in-process, HTTP, or subprocess). The contract between the bot and any plugin is a transport-agnostic JSON shape (`CommandContext` in, `PluginResponse` out). Plugins are self-contained and never interact with Discord directly.

### Consequences

- Positive: Any language can implement a plugin by conforming to the JSON contract
- Positive: The Discord core is entirely decoupled from business logic
- Positive: Built-in plugins (TypeScript, in-process) and external plugins (any language, HTTP/subprocess) are first-class citizens
- Negative: Plugin authors must conform to the defined JSON contract
- Neutral: Contract shape will evolve — interface definitions live in code, not this ADR
