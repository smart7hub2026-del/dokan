/**
 * Render: اجرای غیرتعاملی db push سپس سرور API (با لاگ برای عیب‌یابی).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
process.chdir(root);

function runShell(label, cmd) {
  console.log(`[render-start] ${label}`);
  const r = spawnSync(cmd, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(`[render-start] FAILED: ${label} (exit ${r.status ?? 'unknown'})`);
    process.exit(r.status ?? 1);
  }
}

runShell('Step 1: prisma db push --accept-data-loss', 'npx prisma db push --accept-data-loss');

const indexJs = path.join(root, 'server', 'index.js');
console.log('[render-start] Step 2: API server');
const node = spawnSync(process.execPath, ['--no-warnings', indexJs], {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
  shell: false,
});
process.exit(node.status ?? 1);
