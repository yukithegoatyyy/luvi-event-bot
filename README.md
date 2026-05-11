# Luvi Event Bot

A Discord bot built with Node.js and `discord.js` v14 that watches one channel for Luvi reward messages, parses gift rewards, stores persistent user totals, and provides `/leaderboard` and `/points` slash commands.

## Setup

1. Install Node.js 20.11 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your private local environment file:
   ```bash
   npm run setup
   ```
   This creates `.env` from `.env.example`. Put your real token only in `.env`; `.env` is ignored by git and must stay secret.

   Required values:
   - `APIKEY`: your Discord bot token. `DISCORD_TOKEN` also works, but `APIKEY` is the primary name used by this repo.
   - `CHANNEL_ID`: the Discord channel ID where reward messages appear.
   - `LUVI_BOT_ID`: the Luvi bot's user ID.
   Optional values:
   - `GUILD_ID`: registers slash commands instantly in one test server instead of globally.
   - `DATA_FILE`: changes where points are stored; defaults to `./data/points.json`.
4. In the Discord Developer Portal, enable the **Message Content Intent** for your bot.
5. Invite the bot with these scopes/permissions:
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `View Channel`, `Read Message History`, `Send Messages`
6. Confirm `.env` contains your private token and IDs, then start the bot:
   ```bash
   npm start
   ```

   `npm start` automatically loads `.env` when it exists. For hosted deployments, you do not need an `.env` file; set `APIKEY`, `CHANNEL_ID`, and `LUVI_BOT_ID` as platform secrets/environment variables instead.

## Keeping your token secret

- Do **not** edit `.env.example` with a real token; it is committed documentation only.
- For local testing, put your real `APIKEY`, `CHANNEL_ID`, and `LUVI_BOT_ID` in the untracked `.env` file created by `npm run setup`.
- If you deploy the bot, add `APIKEY`, `CHANNEL_ID`, and `LUVI_BOT_ID` as your host's secret/environment variables; no `.env` file is required on the host.
- If a token is ever committed or shared, reset it immediately in the Discord Developer Portal.

## Hosting / going live

The bot is ready to host once these secrets/environment variables are set on your host:

- `APIKEY` - your Discord bot token. This repo reads `process.env.APIKEY`, so a host/repo secret named `APIKEY` will not cause a problem. (`DISCORD_TOKEN` is still accepted as a fallback.)
- `CHANNEL_ID` - the channel the bot should watch.
- `LUVI_BOT_ID` - the Luvi bot user ID to trust.
- Optional: `GUILD_ID` for fast slash-command registration in one server.
- Optional: `DATA_FILE` for the JSON storage path.

Deployment options included in this repo:

- **Worker-style hosts** such as Railway, Render worker, Fly machine, or Heroku worker can run `npm start`. The included `Procfile` defines `worker: npm start`.
- **Docker hosts** can build this repo with the included `Dockerfile`. Pass the same secrets as environment variables.
- **Web-service hosts** that require a listening port can set `PORT`; the bot will start a small health server and respond at `/health` while the Discord client runs.

Important: if your host has an ephemeral filesystem, `data/points.json` may reset on redeploy. Use a mounted persistent volume or set `DATA_FILE` to a persisted path if you need totals to survive host restarts/redeploys.

## Commands

- `/leaderboard` - shows the top 10 users by points.
- `/points` - shows your current total points.

## Scoring

- Gold:
  - 100-199 = 1 point
  - 200-299 = 2 points
  - 300-399 = 3 points
  - 400-500 = 4 points
- Card:
  - Common or Rare = 1 point
  - Exotic = 2 points
  - Legendary = 4 points
  - Ethereal = 0 points
- Core:
  - Core received = 5 points
