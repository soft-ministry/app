import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2] || process.env.APP_VERSION;
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error('Versiunea trebuie să aibă formatul major.minor.patch.');
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(scriptDir, '..', 'frontend', 'src', 'app', 'core', 'app-version.ts');
const content = `/** Generated version for this build. */\nexport const APP_VERSION = '${version}';\n`;

fs.writeFileSync(versionFile, content, 'utf8');
console.log(`Versiunea frontend setată la ${version}.`);
