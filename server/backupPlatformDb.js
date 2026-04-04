import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { loadDatabase } from './storage.js';
import { encryptBackupBuffer, loadPlatformBackupAesKey } from './backupCrypto.js';
import { uploadBackupFileToS3 } from './s3BackupUpload.js';

const gzipAsync = promisify(zlib.gzip);

/**
 * مسیر مطلق فایل SQLite قدیمی از DATABASE_URL (فقط وقتی هنوز file: است).
 */
export function resolvePlatformSqlitePath() {
  const raw = process.env.DATABASE_URL || '';
  const rel = raw.replace(/^file:/, '').replace(/^\//, '').replace(/^\.\//, '');
  return path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
}

export function isPostgresDatasource() {
  const u = String(process.env.DATABASE_URL || '').trim().toLowerCase();
  return u.startsWith('postgresql:') || u.startsWith('postgres:');
}

function isPostgresUrl(url) {
  const u = String(url || '').trim().toLowerCase();
  return u.startsWith('postgresql:') || u.startsWith('postgres:');
}

function backupKeepCount() {
  const n = Number(process.env.PLATFORM_BACKUP_KEEP || process.env.AUTO_BACKUP_KEEP_COUNT || 30);
  return Number.isFinite(n) && n >= 1 ? Math.min(500, n) : 30;
}

function pgDumpKeepCount() {
  const n = Number(process.env.PG_DUMP_KEEP || 14);
  return Number.isFinite(n) && n >= 1 ? Math.min(200, n) : 14;
}

function wantGzipExtraCopy() {
  return String(process.env.PLATFORM_BACKUP_GZIP || '').toLowerCase() === 'true' || process.env.PLATFORM_BACKUP_GZIP === '1';
}

function wantPlaintextAlsoWhenEncrypted() {
  return String(process.env.PLATFORM_BACKUP_PLAINTEXT_ALSO || 'true').toLowerCase() !== 'false';
}

async function atomicWriteFile(destPath, data) {
  const dir = path.dirname(destPath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${destPath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, destPath);
}

/**
 * PostgreSQL: اسنپ‌شات JSON + مانیفست (SHA-256، اندازه، زمان).
 * SQLite قدیمی: کپی اتمی .db + مانیفست.
 * رمزنگاری اختیاری (AES-256-GCM) و آپلود S3 اختیاری.
 * @returns {Promise<{ path: string, manifestPath: string, sha256: string, byteLength: number, gzipPath: string | null, encPath: string | null, backend: 'postgresql' | 'sqlite', s3?: object }>}
 */
export async function copyPlatformDatabase() {
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const at = new Date().toISOString();

  if (isPostgresUrl(process.env.DATABASE_URL)) {
    const db = await loadDatabase();
    const body = JSON.stringify(db);
    const buf = Buffer.from(body, 'utf8');
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const dest = path.join(dir, `platform-${stamp}.json`);
    await atomicWriteFile(dest, body);

    let gzipPath = null;
    if (wantGzipExtraCopy()) {
      const gz = await gzipAsync(buf);
      gzipPath = path.join(dir, `platform-${stamp}.json.gz`);
      await atomicWriteFile(gzipPath, gz);
    }

    let encPath = null;
    if (loadPlatformBackupAesKey()) {
      const enc = encryptBackupBuffer(buf);
      encPath = path.join(dir, `platform-${stamp}.json.enc`);
      await atomicWriteFile(encPath, enc);
      if (!wantPlaintextAlsoWhenEncrypted()) {
        await fs.unlink(dest).catch(() => {});
      }
    }

    const manifest = {
      format: 'dokanyar-platform-backup-manifest-v1',
      createdAt: at,
      backend: 'postgresql',
      primaryFile: path.basename(encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest),
      sha256,
      byteLength: buf.length,
      gzipFile: gzipPath ? path.basename(gzipPath) : null,
      encryptedFile: encPath ? path.basename(encPath) : null,
      encryption: encPath ? 'aes-256-gcm-v1' : null,
      note: 'بازیابی سطح پلتفرم با import اسنپ‌شات JSON (ابرادمین) یا مهاجرت جدا.',
    };
    const manifestPath = path.join(dir, `platform-${stamp}.manifest.json`);
    await atomicWriteFile(manifestPath, JSON.stringify(manifest, null, 2));

    const s3Results = [];
    if (String(process.env.S3_BACKUP_BUCKET || '').trim()) {
      const tryUp = async (local, key, ct) => {
        const r = await uploadBackupFileToS3({ localPath: local, key, contentType: ct });
        s3Results.push({ key, ...r });
      };
      try {
        const primaryLocal =
          encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest;
        if (await fs.access(primaryLocal).then(() => true).catch(() => false)) {
          await tryUp(
            primaryLocal,
            path.basename(primaryLocal),
            primaryLocal.endsWith('.enc') ? 'application/octet-stream' : 'application/json; charset=utf-8',
          );
        }
        if (gzipPath && (await fs.access(gzipPath).then(() => true).catch(() => false))) {
          await tryUp(gzipPath, path.basename(gzipPath), 'application/gzip');
        }
        await tryUp(manifestPath, path.basename(manifestPath), 'application/json; charset=utf-8');
      } catch (e) {
        s3Results.push({ error: String(e?.message || e) });
      }
    }

    const primaryWritten =
      encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest;
    return {
      path: primaryWritten,
      manifestPath,
      sha256,
      byteLength: buf.length,
      gzipPath,
      encPath,
      backend: 'postgresql',
      s3: s3Results.length ? s3Results : undefined,
    };
  }

  const src = resolvePlatformSqlitePath();
  await fs.access(src);
  const buf = await fs.readFile(src);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  const dest = path.join(dir, `platform-${stamp}.db`);
  await atomicWriteFile(dest, buf);

  let encPath = null;
  if (loadPlatformBackupAesKey()) {
    const enc = encryptBackupBuffer(buf);
    encPath = path.join(dir, `platform-${stamp}.db.enc`);
    await atomicWriteFile(encPath, enc);
    if (!wantPlaintextAlsoWhenEncrypted()) {
      await fs.unlink(dest).catch(() => {});
    }
  }

  const manifest = {
    format: 'dokanyar-platform-backup-manifest-v1',
    createdAt: at,
    backend: 'sqlite_file',
    primaryFile: path.basename(encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest),
    sha256,
    byteLength: buf.length,
    sourcePathHint: 'file: DATABASE_URL',
    encryptedFile: encPath ? path.basename(encPath) : null,
    encryption: encPath ? 'aes-256-gcm-v1' : null,
  };
  const manifestPath = path.join(dir, `platform-${stamp}.manifest.json`);
  await atomicWriteFile(manifestPath, JSON.stringify(manifest, null, 2));

  const s3Results = [];
  if (String(process.env.S3_BACKUP_BUCKET || '').trim()) {
    try {
      const primaryLocal = encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest;
      const r1 = await uploadBackupFileToS3({
        localPath: primaryLocal,
        key: path.basename(primaryLocal),
        contentType: 'application/octet-stream',
      });
      s3Results.push(r1);
      const r2 = await uploadBackupFileToS3({
        localPath: manifestPath,
        key: path.basename(manifestPath),
        contentType: 'application/json',
      });
      s3Results.push(r2);
    } catch (e) {
      s3Results.push({ error: String(e?.message || e) });
    }
  }

  const primaryWritten = encPath && !wantPlaintextAlsoWhenEncrypted() ? encPath : dest;
  return {
    path: primaryWritten,
    manifestPath,
    sha256,
    byteLength: buf.length,
    gzipPath: null,
    encPath,
    backend: 'sqlite',
    s3: s3Results.length ? s3Results : undefined,
  };
}

export async function pruneBackupFiles(keepCount = backupKeepCount()) {
  const dir = path.join(process.cwd(), 'server', 'backups');
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter(
      (e) =>
        e.isFile() &&
        /^platform-.*\.(db|db\.enc|json|json\.gz|json\.enc|manifest\.json)$/i.test(e.name),
    )
    .map((e) => e.name);

  const stems = new Set();
  for (const name of files) {
    const m = /^platform-(.+)\.(db|db\.enc|json|json\.gz|json\.enc|manifest\.json)$/i.exec(name);
    if (m) stems.add(m[1]);
  }
  const sortedStems = [...stems].sort().reverse();
  const staleStems = sortedStems.slice(Math.max(0, keepCount));
  let pruned = 0;
  for (const stem of staleStems) {
    for (const ext of ['manifest.json', 'json.enc', 'json.gz', 'json', 'db.enc', 'db']) {
      const fn = `platform-${stem}.${ext}`;
      if (files.includes(fn)) {
        await fs.unlink(path.join(dir, fn)).catch(() => {});
        pruned += 1;
      }
    }
  }

  const pgdumpFiles = entries
    .filter((e) => e.isFile() && /^pgdump-.*\.sql\.gz$/i.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  const keepPg = pgDumpKeepCount();
  for (const name of pgdumpFiles.slice(keepPg)) {
    await fs.unlink(path.join(dir, name)).catch(() => {});
    pruned += 1;
  }

  return { kept: Math.min(sortedStems.length, keepCount), pruned };
}
