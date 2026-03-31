import fs from 'fs/promises';
import path from 'path';

/**
 * مسیر مطلق فایل SQLite پلتفرم از DATABASE_URL (همان منطق کپی بکاپ).
 */
export function resolvePlatformSqlitePath() {
  const raw = process.env.DATABASE_URL || 'file:./server/prisma/dev.db';
  const rel = raw.replace(/^file:/, '').replace(/^\.\//, '');
  return path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
}

/**
 * کپی فایل SQLite پلتفرم به server/backups/ (بدون توقف سرویس؛ برای SQLite تک‌فایل معمولاً کافی است).
 */
export async function copyPlatformDatabase() {
  const src = resolvePlatformSqlitePath();
  await fs.access(src);
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `platform-${stamp}.db`);
  await fs.copyFile(src, dest);
  return dest;
}

export async function pruneBackupFiles(keepCount = 30) {
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /^platform-.*\.db$/i.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  const stale = files.slice(Math.max(0, keepCount));
  await Promise.all(stale.map((name) => fs.unlink(path.join(dir, name)).catch(() => {})));
  return { kept: files.length - stale.length, pruned: stale.length };
}
