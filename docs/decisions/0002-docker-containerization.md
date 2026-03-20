---
status: accepted
date: 2026-02-28
decision-makers: nishyfish
---

# Containerization with Docker

## Context and Problem Statement

The bot and its plugins need to run consistently across different contributor environments and on a host server. Plugins may be written in different languages and runtimes. How do we package and orchestrate them?

## Decision Drivers

- Contributors write plugins in different languages — no shared environment assumptions
- Need to orchestrate multiple services (bot, database, plugin microservices)
- Should work on macOS developer machines and Linux servers
- Low friction for contributors to add new plugins

## Considered Options

- Docker + docker-compose
- LXC (Linux Containers)

## Decision Outcome

Chosen option: **Docker + docker-compose**.

Each service (bot, database, plugin) runs as a Docker container. docker-compose orchestrates them. Contributors ship a `Dockerfile` alongside their plugin code.

### Consequences

- Positive: Contributors only need a `Dockerfile` to add a new plugin service — no environment setup required
- Positive: docker-compose naturally models the multi-service architecture (bot + db + N plugins)
- Positive: Works on macOS via OrbStack (chosen runtime — fast, lightweight, native ARM64 performance)
- Neutral: Docker Desktop is an alternative macOS runtime but carries more overhead; OrbStack is preferred for this project
- Neutral: LXC was considered but is optimised for full OS isolation on dedicated Linux servers, not the application-container model used here
