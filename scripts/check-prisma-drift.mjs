/**
 * مقایسهٔ server/prisma با backend/prisma — در صورت اختلاف خروجی ۱.
 * قبل از release یا بعد از ویرایش migration اجرا کنید.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function walkFiles(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.endsWith('.db') || ent.name.endsWith('.db-journal')) continue;
    const rel = path.join(base, ent.name);
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full, rel));
    else out.push(rel);
  }
  return out.sort();
}

const sRoot = path.join(root, 'server', 'prisma');
const bRoot = path.join(root, 'backend', 'prisma');
const sSchema = path.join(sRoot, 'schema.prisma');
const bSchema = path.join(bRoot, 'schema.prisma');

const a = readSafe(sSchema);
const b = readSafe(bSchema);
if (a == null) {
  console.error('[prisma-drift] missing', sSchema);
  process.exit(1);
}
if (b == null || a !== b) {
  console.error('[prisma-drift] schema.prisma differs or backend copy missing. Run: npm run sync:prisma');
  process.exit(1);
}

const sFiles = walkFiles(path.join(sRoot, 'migrations'));
const bFiles = walkFiles(path.join(bRoot, 'migrations'));
if (sFiles.length !== bFiles.length) {
  console.error('[prisma-drift] migrations file count differs');
  process.exit(1);
}
for (const rel of sFiles) {
  const sa = readSafe(path.join(sRoot, 'migrations', rel));
  const bb = readSafe(path.join(bRoot, 'migrations', rel));
  if (sa !== bb) {
    console.error('[prisma-drift] differs:', rel);
    process.exit(1);
  }
}

console.log('[prisma-drift] server/prisma ↔ backend/prisma (OK)');
