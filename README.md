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
   - `DISCORD_TOKEN`: your Discord bot token.
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

   `npm start` automatically loads `.env` when it exists. For hosted deployments, set the same names as platform secrets/environment variables instead of committing a `.env` file.

## Keeping your token secret

- Do **not** edit `.env.example` with a real token; it is committed documentation only.
- Put your real `DISCORD_TOKEN`, `CHANNEL_ID`, and `LUVI_BOT_ID` in the untracked `.env` file created by `npm run setup`.
- If you deploy the bot, add `DISCORD_TOKEN`, `CHANNEL_ID`, and `LUVI_BOT_ID` as your host's secret/environment variables.
- If a token is ever committed or shared, reset it immediately in the Discord Developer Portal.

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
