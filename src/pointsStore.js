import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DATA_FILE } from './config.js';

const MAX_PROCESSED = 10_000;
const absoluteDataFile = path.resolve(DATA_FILE);

let store = { users: {}, processedMessages: [] };
let writeQueue = Promise.resolve();

export async function loadStore() {
  try {
    const raw = await readFile(absoluteDataFile, 'utf8');
    const parsed = JSON.parse(raw);
    store = {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      processedMessages: Array.isArray(parsed.processedMessages) ? parsed.processedMessages : [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    await saveStore();
  }
}

function saveStore() {
  writeQueue = writeQueue.then(async () => {
    await mkdir(path.dirname(absoluteDataFile), { recursive: true });
    const tmp = `${absoluteDataFile}.tmp`;
    await writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    await rename(tmp, absoluteDataFile);
  });
  return writeQueue;
}

export function isProcessed(messageId) {
  return store.processedMessages.includes(messageId);
}

export function markProcessed(messageId) {
  store.processedMessages.push(messageId);
  if (store.processedMessages.length > MAX_PROCESSED) {
    store.processedMessages = store.processedMessages.slice(-MAX_PROCESSED);
  }
}

export function getUser(userId) {
  return store.users[userId] ?? null;
}

export function getPoints(userId) {
  return store.users[userId]?.points ?? 0;
}

export function addPoints(userId, username, delta) {
  const current = store.users[userId]?.points ?? 0;
  const newTotal = Math.max(0, current + delta);
  store.users[userId] = { points: newTotal, username };
  return newTotal;
}

export function setUsername(userId, username) {
  if (store.users[userId]) {
    store.users[userId].username = username;
  }
}

export function getAllUsers() {
  return Object.entries(store.users)
    .map(([id, data]) => ({ id, points: data.points ?? 0, username: data.username ?? id }))
    .sort((a, b) => b.points - a.points);
}

export { saveStore };
