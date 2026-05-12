function getGoldPoints(amount) {
  if (amount >= 100 && amount <= 199) return 1;
  if (amount >= 200 && amount <= 299) return 2;
  if (amount >= 300 && amount <= 399) return 3;
  if (amount >= 400 && amount <= 500) return 4;
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
    default:
      return 0;
  }
}

export function extractEmbedText(message) {
  const parts = [message.content ?? ''];

  for (const embed of message.embeds) {
    if (embed.title) parts.push(embed.title);
    if (embed.description) parts.push(embed.description);
    for (const field of embed.fields ?? []) {
      if (field.name) parts.push(field.name);
      if (field.value) parts.push(field.value);
    }
    if (embed.footer?.text) parts.push(embed.footer.text);
  }

  return parts.join('\n');
}

export function parseReward(text) {
  // Match **258** Gold, 258 Gold, Gold: 258, Gold 258 — all formats
  const goldMatch = text.match(/(?:\*\*)?(\d[\d,]*)(?:\*\*)?\s*[Gg]old|[Gg]old[:\s]+(?:\*\*)?(\d[\d,]*)(?:\*\*)?/i);
  const rarityMatch = text.match(/\b(Common|Rare|Exotic|Legendary)\b/i);

  const mentionsCore = /\bcore\b/i.test(text);
  const coreConfirmed = /\b(?:received|got|earned|get)\b[^.!?\n]{0,30}\bcore\b|\bcore\b[^.!?\n]{0,30}\b(?:received|got|earned|get)\b/i.test(text);
  const coreReceived = mentionsCore && coreConfirmed;

  const rawGold = goldMatch?.[1] ?? goldMatch?.[2] ?? '0';
  const goldAmount = Number.parseInt(rawGold.replaceAll(',', ''), 10);
  const cardRarity = rarityMatch?.[1] ?? null;

  const goldPoints = getGoldPoints(goldAmount);
  const cardPoints = getCardPoints(cardRarity);
  const corePoints = coreReceived ? 5 : 0;
  const totalPoints = goldPoints + cardPoints + corePoints;

  const isReward = goldAmount > 0 && (cardRarity !== null || coreReceived);

  return {
    isReward,
    goldAmount,
    goldPoints,
    cardRarity,
    cardPoints,
    coreReceived,
    corePoints,
    totalPoints,
  };
}

export function extractMentionedUserId(text) {
  return text.match(/<@!?(\d{17,20})>/)?.[1] ?? null;
}

export function formatConfirmation(userId, reward, newTotal) {
  const parts = [];
  if (reward.goldAmount > 0) parts.push(`⭐ Gold ${reward.goldAmount}`);
  if (reward.cardRarity) parts.push(`🃏 ${reward.cardRarity}`);
  if (reward.coreReceived) parts.push('💎 Core');
  const breakdown = parts.length ? ` (${parts.join(', ')})` : '';
  return `🎁 <@${userId}> earned **+${reward.totalPoints} pts**${breakdown}! Total: **${newTotal} pts**`;
}

export function calcPointsFromInputs({ gold = 0, card = null, core = false }) {
  return getGoldPoints(gold) + getCardPoints(card) + (core ? 5 : 0);
}
