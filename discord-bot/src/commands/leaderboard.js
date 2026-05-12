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

  const all = getAllUsers().filter((u) => u.points > 0);

  if (all.length === 0) {
    await interaction.reply({ content: 'No points have been recorded yet.', flags: MessageFlags.Ephemeral });
    return;
  }

  const top10 = all.slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];

  const podiumLines = top10.slice(0, 3).map((u, i) =>
    `${medals[i]} <@${u.id}> — **${u.points} pts**`,
  );

  const restLines = top10.slice(3).map((u, i) =>
    `\`${i + 4}.\` <@${u.id}> — ${u.points} pts`,
  );

  const separator = '─────────────────────';
  const description = [
    podiumLines.join('\n'),
    restLines.length > 0 ? `${separator}\n${restLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🏆 Luvi Gift Leaderboard')
    .setColor(0xffd700)
    .setDescription(description)
    .setFooter({
      text: `👥 ${all.length} player${all.length === 1 ? '' : 's'} • Points for gold, card rarity & cores`,
    })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
