import { access, copyFile } from 'node:fs/promises';
import process from 'node:process';

const target = '.env';
const source = '.env.example';

try {
  await access(target);
  console.log(`${target} already exists. Edit it locally to add your Discord token and IDs.`);
} catch {
  await copyFile(source, target);
  console.log(`Created ${target} from ${source}.`);
  console.log('Open .env and replace the placeholder values with your private token and IDs.');
  console.log('Do not commit .env; it is intentionally ignored by git.');
}

process.exit(0);
