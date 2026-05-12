import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
} from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DISCORD_BOT_TOKEN,
  DISCORD_CHANNEL_ID,
  LUVI_BOT_ID,
  ALLOWED_ROLE_IDS,
} from './config.js';
import { deployCommands } from './deployCommands.js';
import {
  loadStore,
  isProcessed,
  markProcessed,
  getPoints,
  addPoints,
  getAllUsers,
  saveStore,
  setUsername,
} from './pointsStore.js';
import {
  extractEmbedText,
  parseReward,
  extractMentionedUserId,
  formatConfirmation,
  calcPointsFromInputs,
} from './parseReward.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.slashCommands = new Collection();

function isStaff(member) {
  return member?.roles?.cache && ALLOWED_ROLE_IDS.some((id) => member.roles.cache.has(id));
}

function chunkText(text, maxLen = 1900) {
  const chunks = [];
  while (text.length > maxLen) {
    let cut = text.lastIndexOf('\n', maxLen);
    if (cut === -1) cut = maxLen;
    chunks.push(text.slice(0, cut));
    text = text.slice(cut + 1);
  }
  if (text.length > 0) chunks.push(text);
  return chunks;
}

client.once(Events.ClientReady, async (readyClient) => {
  await loadStore();

  const commandsPath = path.join(__dirname, 'commands');
  const files = (await readdir(commandsPath)).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const mod = await import(path.join(commandsPath, file));
    client.slashCommands.set(mod.name, mod);
  }

  await deployCommands();

  console.log(`Logged in as ${readyClient.user.tag}`);
  console.log(`Watching channel: ${DISCORD_CHANNEL_ID}`);
  console.log(`Trusting Luvi bot ID: ${LUVI_BOT_ID}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot && message.author.id !== LUVI_BOT_ID) return;

  if (!message.author.bot) {
    await handleTextCommand(message);
    return;
  }

  if (message.channelId !== DISCORD_CHANNEL_ID) return;
  if (isProcessed(message.id)) return;

  const text = extractEmbedText(message);
  const reward = parseReward(text);

  if (!reward.isReward) return;

  const userId = extractMentionedUserId(text);
  if (!userId) {
    console.warn(`Skipped message ${message.id}: no user mention found.`);
    return;
  }

  let username = userId;
  try {
    const member = await message.guild?.members.fetch(userId);
    if (member) {
      username = member.user.username;
      setUsername(userId, username);
    }
  } catch {
  }

  const newTotal = addPoints(userId, username, reward.totalPoints);
  markProcessed(message.id);
  await saveStore();

  console.log(
    `+${reward.totalPoints} pts for ${userId} from msg ${message.id}. Total: ${newTotal}. ` +
      `Gold: ${reward.goldAmount}, Card: ${reward.cardRarity}, Core: ${reward.coreReceived}`,
  );

  await message.channel.send(formatConfirmation(userId, reward, newTotal));
});

async function handleTextCommand(message) {
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  const staffOnly = ['addpoints', 'removepoints'];

  if (staffOnly.includes(command) && !isStaff(message.member)) return;

  switch (command) {
    case 'leaderboard': {
      const top10 = getAllUsers().slice(0, 10);
      if (top10.length === 0) {
        await message.channel.send('No points recorded yet.');
        return;
      }
      const lines = top10.map((u, i) => `**${i + 1}.** <@${u.id}> — ${u.points} pts`);
      await message.channel.send(`🏆 **Luvi Gift Leaderboard**\n${lines.join('\n')}`);
      break;
    }

    case 'allpoints': {
      const all = getAllUsers();
      if (all.length === 0) {
        await message.channel.send('No points recorded yet.');
        return;
      }
      const lines = all.map((u, i) => `${i + 1}. ${u.username} (<@${u.id}>) — ${u.points} pts`);
      const full = lines.join('\n');
      for (const chunk of chunkText(full)) {
        await message.channel.send(chunk);
      }
      break;
    }

    case 'points': {
      const mentioned = message.mentions.users.first();
      if (mentioned) {
        const pts = getPoints(mentioned.id);
        await message.channel.send(`<@${mentioned.id}> has **${pts} pts**.`);
      } else {
        const pts = getPoints(message.author.id);
        await message.channel.send(`You have **${pts} pts**.`);
      }
      break;
    }

    case 'addpoints': {
      if (!isStaff(message.member)) return;
      const target = message.mentions.users.first();
      const amount = Number.parseInt(args[1], 10);
      if (!target || Number.isNaN(amount) || amount <= 0) {
        await message.channel.send('Usage: `!addpoints @user <amount>`');
        return;
      }
      const newTotal = addPoints(target.id, target.username, amount);
      await saveStore();
      await message.channel.send(`✅ Added **+${amount} pts** to <@${target.id}>. Total: **${newTotal} pts**`);
      break;
    }

    case 'removepoints': {
      if (!isStaff(message.member)) return;
      const target = message.mentions.users.first();
      const amount = Number.parseInt(args[1], 10);
      if (!target || Number.isNaN(amount) || amount <= 0) {
        await message.channel.send('Usage: `!removepoints @user <amount>`');
        return;
      }
      const current = getPoints(target.id);
      const newTotal = addPoints(target.id, target.username, -amount);
      await saveStore();
      const note = amount > current ? ` *(capped — they only had ${current} pts)*` : '';
      await message.channel.send(
        `✅ Removed **${Math.min(amount, current)} pts** from <@${target.id}>. Total: **${newTotal} pts**${note}`,
      );
      break;
    }

    case 'commands': {
      const list = [
        '`!leaderboard` — top 10 users',
        '`!allpoints` — all users sorted by points',
        '`!points` — your point total',
        '`!points @user` — another user\'s total',
        '`!addpoints @user <amount>` — add exact points *(staff)*',
        '`!removepoints @user <amount>` — remove points, clamped at 0 *(staff)*',
        '',
        '**Slash commands**',
        '`/leaderboard` — top 10 embed *(staff)*',
        '`/addpoints` — add points from reward inputs *(staff)*',
        '`/removepoints` — remove points *(staff)*',
      ];
      await message.channel.send(`**Available commands:**\n${list.join('\n')}`);
      break;
    }

    default:
      break;
  }
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.slashCommands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const reply = { content: 'An error occurred while running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(DISCORD_BOT_TOKEN);
