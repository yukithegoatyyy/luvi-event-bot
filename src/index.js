/**
 * Luvi Event Bot setup
 *
 * 1. Install Node.js 20.11 or newer.
 * 2. Run `npm install` to install discord.js.
 * 3. Copy `.env.example` to `.env` and fill in:
 *    - DISCORD_TOKEN: your Discord bot token.
 *    - CHANNEL_ID: the reward channel to listen in.
 *    - LUVI_BOT_ID: the specific Luvi bot user ID to process.
 *    - GUILD_ID: optional, for fast guild-only slash command registration.
 *    - DATA_FILE: optional, defaults to ./data/points.json.
 * 4. Enable the Message Content Intent in the Discord Developer Portal.
 * 5. Run `npm start` (`.env` is loaded automatically when it exists).
 */

import {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const LUVI_BOT_ID = process.env.LUVI_BOT_ID;
const GUILD_ID = process.env.GUILD_ID;
const DATA_FILE = process.env.DATA_FILE ?? './data/points.json';

// The bot cannot safely run without these values because they control what is
// listened to and which bot is trusted as the reward-message source.
for (const [name, value] of Object.entries({ DISCORD_TOKEN, CHANNEL_ID, LUVI_BOT_ID })) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const absoluteDataFile = path.resolve(DATA_FILE);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Required so the bot can read and parse Luvi reward message text.
    GatewayIntentBits.MessageContent,
  ],
});

const slashCommands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 Luvi gift reward point totals.'),
  new SlashCommandBuilder()
    .setName('points')
    .setDescription('Show your current Luvi gift reward point total.'),
].map((command) => command.toJSON());

const initialStore = () => ({
  users: {},
  processedMessages: {},
});

let store = initialStore();
let writeQueue = Promise.resolve();

async function loadStore() {
  try {
    const raw = await readFile(absoluteDataFile, 'utf8');
    const parsed = JSON.parse(raw);

    // Keep the file tolerant of future schema changes and manual edits.
    store = {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      processedMessages:
        parsed.processedMessages && typeof parsed.processedMessages === 'object'
          ? parsed.processedMessages
          : {},
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await saveStore();
  }
}

function saveStore() {
  // Serialize writes so simultaneous messages cannot corrupt the JSON file.
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(absoluteDataFile), { recursive: true });
    const tempFile = `${absoluteDataFile}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await rename(tempFile, absoluteDataFile);
  });

  return writeQueue;
}

function getGoldPoints(goldAmount) {
  if (goldAmount >= 100 && goldAmount <= 199) return 1;
  if (goldAmount >= 200 && goldAmount <= 299) return 2;
  if (goldAmount >= 300 && goldAmount <= 399) return 3;
  if (goldAmount >= 400 && goldAmount <= 500) return 4;
  return 0;
}

function getCardPoints(rarity) {
  switch (rarity?.toLowerCase()) {
    case 'common':
    case 'rare':
      return 1;
    case 'exotic':
      return 2;
    case 'legendary':
      return 4;
    case 'ethereal':
    default:
      return 0;
  }
}

function userIdFromMessage(message) {
  // Prefer Discord's parsed mentions, then fall back to raw mention syntax.
  const mentionedUser = message.mentions.users.first();
  if (mentionedUser) return mentionedUser.id;

  return message.content.match(/<@!?(\d{17,20})>/)?.[1] ?? null;
}

function parseRewardMessage(content) {
  const goldMatch = content.match(/Gold\s*Reward\s*:\s*([\d,]+)\s*gold/i);
  const rarityMatch = content.match(/\b(Common|Rare|Exotic|Legendary|Ethereal)\b/i);

  // Count a Core only when the text positively mentions one, while avoiding
  // common negative phrases such as "no core" or "without core".
  const mentionsCore = /\bcore\b/i.test(content);
  const deniesCore = /\b(?:no|without|0)\s+cores?\b|\bcores?\s*:\s*(?:no|none|0)\b/i.test(content);
  const coreReceived = mentionsCore && !deniesCore;

  const goldAmount = goldMatch ? Number.parseInt(goldMatch[1].replaceAll(',', ''), 10) : 0;
  const cardRarity = rarityMatch?.[1] ?? null;
  const goldPoints = getGoldPoints(goldAmount);
  const cardPoints = getCardPoints(cardRarity);
  const corePoints = coreReceived ? 5 : 0;

  return {
    goldAmount,
    cardRarity,
    coreReceived,
    points: goldPoints + cardPoints + corePoints,
    isRewardLike: Boolean(goldMatch || rarityMatch || mentionsCore),
    breakdown: {
      gold: goldPoints,
      card: cardPoints,
      core: corePoints,
    },
  };
}

async function registerSlashCommands() {
  if (GUILD_ID) {
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.commands.set(slashCommands);
    console.log(`Registered slash commands for guild ${GUILD_ID}.`);
    return;
  }

  await client.application.commands.set(slashCommands);
  console.log('Registered global slash commands.');
}

client.once(Events.ClientReady, async (readyClient) => {
  await loadStore();
  await registerSlashCommands();
  console.log(`Logged in as ${readyClient.user.tag}. Listening in channel ${CHANNEL_ID}.`);
});

client.on(Events.MessageCreate, async (message) => {
  // Listen only to the configured reward channel and trusted Luvi bot ID.
  if (message.channelId !== CHANNEL_ID || message.author.id !== LUVI_BOT_ID) return;

  // Duplicate protection: Discord message IDs are unique, so a stored ID means
  // the same reward message has already been counted.
  if (store.processedMessages[message.id]) return;

  const userId = userIdFromMessage(message);
  if (!userId) {
    console.warn(`Skipped message ${message.id}: no gift opener mention found.`);
    return;
  }

  const reward = parseRewardMessage(message.content);
  if (!reward.isRewardLike) {
    console.warn(`Skipped message ${message.id}: no reward fields were found.`);
    return;
  }

  const previousTotal = store.users[userId]?.points ?? 0;
  const newTotal = previousTotal + reward.points;

  store.users[userId] = {
    points: newTotal,
    lastUpdatedAt: new Date().toISOString(),
  };
  store.processedMessages[message.id] = {
    userId,
    points: reward.points,
    goldAmount: reward.goldAmount,
    cardRarity: reward.cardRarity,
    coreReceived: reward.coreReceived,
    processedAt: new Date().toISOString(),
  };

  await saveStore();

  console.log(
    `Counted ${reward.points} points for ${userId} from message ${message.id}. ` +
      `Total: ${newTotal}. Breakdown: ${JSON.stringify(reward.breakdown)}`,
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'leaderboard') {
    const topUsers = Object.entries(store.users)
      .sort(([, a], [, b]) => (b.points ?? 0) - (a.points ?? 0))
      .slice(0, 10);

    if (topUsers.length === 0) {
      await interaction.reply('No points have been recorded yet.');
      return;
    }

    const lines = topUsers.map(([userId, userData], index) => {
      const rank = index + 1;
      const points = userData.points ?? 0;
      return `**${rank}.** <@${userId}> — ${points} point${points === 1 ? '' : 's'}`;
    });

    await interaction.reply(`🏆 **Luvi Gift Leaderboard**\n${lines.join('\n')}`);
    return;
  }

  if (interaction.commandName === 'points') {
    const points = store.users[interaction.user.id]?.points ?? 0;
    await interaction.reply({
      content: `You currently have **${points}** Luvi gift reward point${points === 1 ? '' : 's'}.`,
      flags: MessageFlags.Ephemeral,
    });
  }
});

client.login(DISCORD_TOKEN);
