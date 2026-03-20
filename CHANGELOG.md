# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- `/karma` slash command with `give`, `take`, `show`, and `board` subcommands — karma is persisted in Azure Table Storage and survives container restarts
- `@azure/data-tables` dependency for Azure Table Storage access
- Core subcommand arg parsing: `src/core/index.ts` now unwraps Discord subcommand options into `args` (backward-compatible — flat commands like `/weather` are unaffected)
- ADR 0007: Azure Table Storage for karma persistence
- GitHub Actions CI/CD workflow: tests gate every push to `main`; passing builds are packaged into a Docker image (tagged `sha-<short-sha>` + `latest`), pushed to Azure Container Registry, and deployed via `terraform apply` in `discord-bot-infra` — no manual steps required
- ADR 0006: GitHub Actions CI/CD with OIDC and automated Terraform deploy
- Repo split: bot source moved to `discord-bot-app`; Terraform infrastructure lives in the separate `discord-bot-infra` repo

## [0.1.0] — 2026-03-16
### Added
- Initial project design document
- Architecture Decision Records for plugin architecture, Docker, TypeScript core, SQLite + Prisma, and discord.js
- TypeScript project scaffold with discord.js v14, dotenv, ESLint, and Prettier
- `src/` directory structure: `core/`, `plugins/`, `adapters/`, `types/`
- npm scripts: `build`, `dev`, `lint`, `format`
- `.env.dev.example` and `.env.prod.example` with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` placeholders — dev and prod use separate bots, differentiated by env file only
- `src/types/index.ts`: `CommandContext`, `PluginResponse`, `InProcessAdapter` contracts
- `src/core/router.ts`: `CommandRouter` — registers plugins, dispatches interactions by command name
- `src/core/registry.ts`: auto-discovery registry — scans `src/plugins/`, validates shape, registers plugins
- `src/core/index.ts`: bot entry point — boots discord.js, registers slash commands, routes interactions
- `src/plugins/weather/index.ts`: `/weather <zipcode>` slash command via wttr.in (ephemeral, no API key)
- Vitest test suite with unit tests for router, registry, and weather plugin
- `Dockerfile`: multi-stage build (`deps` → `build` → `prod`) targeting `node:22-alpine`; produces a lean production image (~150MB) with no devDependencies or source files
- `.dockerignore`: excludes `node_modules/`, `dist/`, secrets (`.env`, `.env.*`), `docs/`, `tests/`, `.git/`, `mise.toml` from the build context
- `mise.toml`: pinned Node version from `latest` to `22` to match the Docker base image
