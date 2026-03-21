# Discord Bot

A Discord bot for the server. Responds to slash commands.

## Commands

### `/weather`

| Option | Required | Description |
|--------|----------|-------------|
| `location` | Yes | City name or address |

Returns current weather conditions for the given location.

### `/karma`

| Subcommand | Options | Description |
|------------|---------|-------------|
| `give` | `user` (required), `amount` 1–5 (optional, default 1) | Give karma to a user |
| `take` | `user` (required), `amount` 1–5 (optional, default 1) | Subtract karma from a user |
| `show` | `user` (optional, default: you) | Show a user's karma score |
| `board` | — | Top 10 karma leaderboard |

Karma persists across sessions. You cannot give or take karma from yourself. Give/take has a 60-second cooldown per user.

---

## Development

**Prerequisites:** [mise](https://mise.jdx.dev) (manages Node version), Docker

```bash
git clone <repo>
cd discord-bot-app
mise install
cp .env.dev.example .env.dev   # fill in tokens and connection strings
npm run dev
```

For full project context — architecture, plugin system, deployment, gotchas — see [`CLAUDE.md`](./CLAUDE.md). An LLM can summarize it for you.
