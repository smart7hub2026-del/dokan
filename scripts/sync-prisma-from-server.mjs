/**
 * منبع حقیقت: server/prisma (هم‌خوان با prisma.config.ts)
 * این اسکریپت schema و migrations را به backend/prisma کپی می‌کند تا drift نماند.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'server', 'prisma');
const destDir = path.join(root, 'backend', 'prisma');

const SKIP_NAMES = new Set(['dev.db', 'dev.db-journal', 'test.db', 'test.db-journal']);

function copyRecursive(rel = '') {
  const from = path.join(srcDir, rel);
  const to = path.join(destDir, rel);
  const names = fs.readdirSync(from, { withFileTypes: true });
  for (const ent of names) {
    if (SKIP_NAMES.has(ent.name) || ent.name.endsWith('.db-journal')) continue;
    const s = path.join(from, ent.name);
    const d = path.join(to, ent.name);
    if (ent.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyRecursive(path.join(rel, ent.name));
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
    }
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('[sync-prisma] missing', srcDir);
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
copyRecursive();
console.log('[sync-prisma] server/prisma → backend/prisma (OK)');
