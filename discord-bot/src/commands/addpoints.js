import { MessageFlags } from 'discord.js';
import { ALLOWED_ROLE_IDS } from '../config.js';
import { addPoints, getPoints, saveStore } from '../pointsStore.js';
import { calcPointsFromInputs } from '../parseReward.js';

export const name = 'addpoints';

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
  const gold = interaction.options.getInteger('gold') ?? 0;
  const card = interaction.options.getString('card') ?? null;
  const core = interaction.options.getBoolean('core') ?? false;

  const pts = calcPointsFromInputs({ gold, card, core });

  if (pts === 0) {
    await interaction.reply({
      content: `⚠️ No points would be awarded from those inputs. Check gold amount, card rarity, or core value.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const newTotal = addPoints(target.id, target.username, pts);
  await saveStore();

  const breakdown = [];
  if (gold > 0) breakdown.push(`Gold ${gold}`);
  if (card) breakdown.push(`${card} card`);
  if (core) breakdown.push('Core');

  await interaction.reply(
    `✅ Added **+${pts} points** to <@${target.id}> (${breakdown.join(', ')}). New total: **${newTotal} pts**`,
  );
}
