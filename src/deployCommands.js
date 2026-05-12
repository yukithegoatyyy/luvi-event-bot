import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } from './config.js';

const commands = [
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the top 10 Luvi gift reward point totals.'),

  new SlashCommandBuilder()
    .setName('addpoints')
    .setDescription('Manually add points to a user based on reward inputs.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to add points to.').setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName('gold').setDescription('Gold amount received.').setMinValue(0),
    )
    .addStringOption((opt) =>
      opt
        .setName('card')
        .setDescription('Card rarity received.')
        .addChoices(
          { name: 'Common', value: 'Common' },
          { name: 'Rare', value: 'Rare' },
          { name: 'Exotic', value: 'Exotic' },
          { name: 'Legendary', value: 'Legendary' },
        ),
    )
    .addBooleanOption((opt) =>
      opt.setName('core').setDescription('Was a core received?'),
    ),

  new SlashCommandBuilder()
    .setName('removepoints')
    .setDescription('Remove points from a user.')
    .addUserOption((opt) =>
      opt.setName('user').setDescription('The user to remove points from.').setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName('amount').setDescription('Number of points to remove.').setMinValue(1).setRequired(true),
    ),
].map((c) => c.toJSON());

export async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), {
    body: commands,
  });
  console.log(`Registered ${commands.length} slash commands for guild ${DISCORD_GUILD_ID}.`);
}
