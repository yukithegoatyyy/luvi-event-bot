import { EmbedBuilder, MessageFlags } from 'discord.js';
import { ALLOWED_ROLE_IDS } from '../config.js';
import { getAllUsers } from '../pointsStore.js';

export const name = 'leaderboard';

export async function execute(interaction) {
  const memberRoles = interaction.member?.roles?.cache;
  const isStaff = memberRoles && ALLOWED_ROLE_IDS.some((id) => memberRoles.has(id));

  if (!isStaff) {
    await interaction.reply({
      content: 'You do not have permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const all = getAllUsers();

  if (all.length === 0) {
    await interaction.reply({ content: 'No points have been recorded yet.', flags: MessageFlags.Ephemeral });
    return;
  }

  const top10 = all.slice(0, 10);
  const podiumEmoji = ['🥇', '🥈', '🥉'];

  const podiumLines = top10.slice(0, 3).map((u, i) =>
    `${podiumEmoji[i]} <@${u.id}>\n${u.points} pts`,
  );

  const restLines = top10.slice(3).map((u, i) =>
    `**${i + 4}.** <@${u.id}> — ${u.points} pts`,
  );

  const embed = new EmbedBuilder()
    .setTitle('🏆 Luvi Gift Leaderboard')
    .setColor(0xffd700)
    .addFields(
      { name: '\u200b', value: podiumLines.join('\n\n') },
    )
    .setFooter({
      text: `Points awarded for gold, card rarity & cores • /addpoints to update | ${all.length} player${all.length === 1 ? '' : 's'} total`,
    });

  if (restLines.length > 0) {
    embed.addFields({ name: '\u200b', value: restLines.join('\n') });
  }

  await interaction.reply({ embeds: [embed] });
}
