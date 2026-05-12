export const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
export const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
export const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
export const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
export const LUVI_BOT_ID = process.env.LUVI_BOT_ID;

export const ALLOWED_ROLE_IDS = [
  '1296831373599965296',
  '1472643080908963970',
];

export const DATA_FILE = process.env.DATA_FILE ?? './data/points.json';

const required = {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CHANNEL_ID,
  LUVI_BOT_ID,
};

for (const [name, value] of Object.entries(required)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}
