import { MessageFlags } from 'discord.js';
import { ALLOWED_ROLE_IDS } from '../config.js';
import { getPoints, addPoints, saveStore } from '../pointsStore.js';

export const name = 'removepoints';

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

  const target = interaction.options.getUser('user');
  const amount = interaction.options.getInteger('amount');

  const current = getPoints(target.id);

  if (current === 0) {
    await interaction.reply({
      content: `❌ <@${target.id}> has no points to remove.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const newTotal = addPoints(target.id, target.username, -amount);
  await saveStore();

  const capped = amount > current;
  const note = capped ? ` *(capped at 0 — they only had ${current} pts)*` : '';

  await interaction.reply(
    `✅ Removed **${capped ? current : amount} points** from <@${target.id}>. New total: **${newTotal} pts**${note}`,
  );
}
