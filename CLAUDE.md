# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A TypeScript Discord bot that acts as a transport layer for a private friend-group server. All features are implemented as self-contained plugins — the bot core only handles Discord API communication and routes commands to plugins. Current built-in plugin: `weather`. Next planned: `karma`.

## Commands

```bash
npm run build          # Compile TypeScript → dist/
npm run dev            # Run bot locally (tsx, no compile step)
npm run lint           # Run ESLint (src/ only)
npm run format         # Auto-format with Prettier (src/ only)
npm run test           # Run unit tests (Vitest)
npm run test:watch     # Run Vitest in watch mode
npm run docker:dev     # Build image and run with .env.dev
npm run docker:prod    # Build image and run with .env.prod
```

Run a single test file:
```bash
npx vitest run tests/core/router.test.ts
```

## Architecture

The bot is a routing shell. It never contains business logic directly.

**Request flow:**
```
Discord interaction
  → CommandRouter (resolves plugin by command name)
    → Adapter (InProcess / HTTP / Subprocess)
      → Plugin
        → PluginResponse
          → Discord reply
```

**Key distinction:** discord.js is used as a thin Discord API client only. Its opinionated command handler conventions are not used — the bot has its own plugin registry and router.

## Adding a Plugin

**Built-in (TypeScript, in-process):** Create a directory under `src/plugins/`. The registry auto-discovers it on startup. Implement the `InProcessAdapter` interface.

**External (any language):** *(Not yet implemented — `src/adapters/` exists but is empty; `plugins.config.json` and `docker-compose.yml` don't exist yet.)* When implemented: build the service to accept a `CommandContext` POST and return a `PluginResponse`. Add a `Dockerfile`. Register in `plugins.config.json`:
```json
{ "name": "my-plugin", "adapter": "http", "baseUrl": "http://my-plugin:8080", "commands": ["my-plugin.command"] }
```
Add the service to `docker-compose.yml`.

## Plugin System

Every plugin, regardless of language, conforms to the same transport-agnostic JSON contract:

- **Input (`CommandContext`):** `{ command: string, args: Record<string, string>, context: { guildId, channelId, invokingUserId, invokingUserName } }`
- **Output (`PluginResponse`):** `{ content: string, embeds?: APIEmbed[], ephemeral?: boolean }`
- **Interface (`InProcessAdapter`):** `{ commands: string[], slashCommandDefinitions: RESTPostAPIChatInputApplicationCommandsJSONBody[], execute(ctx): Promise<PluginResponse> }`
- `args` values are always strings (coerced via `String()`); plugins re-parse numeric/boolean values if needed.

Plugins never interact with Discord directly. The three adapter types (InProcess, HTTP, Subprocess) are purely transport — the contract is identical regardless of which is used.

Built-in plugins live in `src/plugins/` and are auto-discovered. External plugins are registered in `plugins.config.json` with their adapter type and connection info.

## Data

Each plugin owns its own persistence. The bot core and built-in plugins will use SQLite via Prisma. There is no shared datastore between plugins.

> **Note:** Prisma is not yet installed or scaffolded. It will be added as a dependency when the `karma` plugin is implemented.

## Documentation Standards

**CHANGELOG.md** — every change goes here before it goes anywhere else. Format: [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/). Sections: `Added / Changed / Fixed / Removed / Deprecated / Security`.

**ADRs** — every significant architectural decision gets a record in `docs/decisions/` named `000N-short-title.md` following [MADR](https://github.com/adr/madr) format. The ADR captures *why* a decision was made, not implementation details (those live in code). See existing ADRs for tone and scope. Specs in `docs/superpowers/` are working documents (gitignored); if a spec proposes a significant architectural change, extract the decision into an ADR.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:
1. Runs the test suite (blocks deploy on failure)
2. Builds and pushes the Docker image to Azure Container Registry (`discordbotprodacr.azurecr.io/discord-bot:sha-<short-sha>`)
3. Runs `terraform apply` in `discord-bot-infra/environments/prod` to update the running container

Infrastructure lives in the separate [`discord-bot-infra`](https://github.com/skarumbu/discord-bot-infra) repo.

## Stack

- **Runtime:** Node.js + TypeScript
- **Discord library:** discord.js v14
- **Test runner:** Vitest
- **ORM:** Prisma
- **Database:** SQLite (core/built-ins); external plugins choose their own
- **Containers:** Docker (OrbStack on macOS). Same image for dev and prod — environment is the only difference:
  ```bash
  docker build -t discordbot:latest .
  docker run --env-file .env.dev discordbot:latest   # dev bot
  docker run --env-file .env.prod discordbot:latest  # prod bot
  ```

**Environment:** Copy `.env.dev.example` → `.env.dev` (dev bot) and `.env.prod.example` → `.env.prod` (prod bot). Fill in `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` for each.

**Node version:** Managed via [mise](https://mise.jdx.dev). Run `mise install` once after cloning.

## Gotchas

- **Entry point:** `src/core/index.ts` — boots the plugin registry, registers slash commands with Discord (guild-scoped, instant), then starts the Discord client.
- **Slash command registration:** Automatic at startup via Discord REST API. No manual step needed when adding a plugin — just implement `slashCommandDefinitions` and restart.
- **Import extensions:** All relative imports must use `.js` extensions (e.g. `from './router.js'`), even in `.ts` source files. Required by `"module": "Node16"`.
- **Dynamic imports:** Must use `pathToFileURL(path).href` — raw filesystem paths throw in ESM (`"type": "module"`).
- **Registry extension detection:** The registry infers whether to import `index.ts` or `index.js` from its own file's extension at runtime (`.ts` in dev via `tsx`, `.js` in prod from compiled output). Plugin entry files must match.
- **Ephemeral replies:** In discord.js reply calls (bot core), use `flags: MessageFlags.Ephemeral` — `ephemeral: true` is deprecated in discord.js v14. Plugins still correctly return `ephemeral: true` in `PluginResponse`; the core translates it.
- **Tests:** Live in `tests/core/` (`router.test.ts`, `registry.test.ts`) and `tests/plugins/weather/`. Excluded from `tsc`, run by Vitest. Mock `fetch` with `vi.stubGlobal('fetch', ...)`. Vitest is configured with `globals: false` — always import `describe`, `it`, `expect`, `vi`, etc. explicitly from `'vitest'`.
- **Plugin export:** Plugins must use `export default pluginInstance`. The registry checks `mod.default ?? mod`, but default export is the convention.
- **Registry crash:** If no plugins load successfully the registry throws and the bot exits. A malformed plugin logs a warning and is skipped; an empty `src/plugins/` crashes on startup.
- **Weather tests:** The 3 ephemeral-assertion tests in `tests/plugins/weather/` currently fail (`result.ephemeral` is `undefined`). Pre-existing issue, unrelated to Docker.
