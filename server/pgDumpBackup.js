import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import zlib from 'zlib';
import { isPostgresDatasource } from './backupPlatformDb.js';

const gzipAsync = promisify(zlib.gzip);

/**
 * pg_dump به فایل فشرده — نیاز به باینری pg_dump در PATH سرور (Render/Linux معمولاً دارد).
 * @returns {Promise<{ path: string | null, skipped?: boolean, error?: string }>}
 */
export async function runScheduledPgDump() {
  if (!isPostgresDatasource()) {
    return { path: null, skipped: true };
  }
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) return { path: null, skipped: true, error: 'no DATABASE_URL' };

  const bin = String(process.env.PG_DUMP_BIN || 'pg_dump').trim();
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sqlPath = path.join(dir, `pgdump-${stamp}.sql`);
  const gzPath = `${sqlPath}.gz`;

  const ok = await new Promise((resolve) => {
    const child = spawn(bin, ['--dbname', url, '--no-owner', '--no-acl', '-f', sqlPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PGPASSWORD: undefined },
    });
    let err = '';
    child.stderr?.on('data', (c) => {
      err += String(c);
    });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });

  if (!ok) {
    await fs.unlink(sqlPath).catch(() => {});
    return { path: null, error: 'pg_dump failed (is pg_dump in PATH?)' };
  }

  const sql = await fs.readFile(sqlPath);
  const gz = await gzipAsync(sql);
  await fs.writeFile(gzPath, gz);
  await fs.unlink(sqlPath).catch(() => {});

  return { path: gzPath };
}
