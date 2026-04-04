/**
 * Render: prisma migrate deploy (بدون data loss) سپس سرور API.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
process.chdir(root);

if (!String(process.env.DATABASE_URL || '').trim()) {
  console.error('[render-start] DATABASE_URL is missing. Set it to your PostgreSQL URL (Render Postgres / Neon).');
  process.exit(1);
}

function runShell(label, cmd) {
  console.log(`[render-start] ${label}`);
  const r = spawnSync(cmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: { ...process.env },
  });
  if (r.status !== 0) {
    console.error(`[render-start] FAILED: ${label} (exit ${r.status ?? 'unknown'})`);
    process.exit(r.status ?? 1);
  }
}

runShell('Step 1: prisma migrate deploy', 'npx prisma migrate deploy');

const indexJs = path.join(root, 'server', 'index.js');
if (!fs.existsSync(indexJs)) {
  console.error('[render-start] server/index.js not found');
  process.exit(1);
}
console.log('[render-start] Step 2: API server');
const node = spawnSync(process.execPath, ['--no-warnings', indexJs], {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env },
  shell: false,
});
process.exit(node.status ?? 1);
