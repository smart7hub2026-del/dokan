import 'dotenv/config';
import app from './app.js';
import { copyPlatformDatabase, pruneBackupFiles } from './backupPlatformDb.js';
import { runScheduledPgDump } from './pgDumpBackup.js';
import { logMasterBackupAudit } from './masterBackupAudit.js';

/** SERVER_PORT برای لوکال (هم‌خوان با vite proxy)؛ در Render معمولاً فقط PORT ست است */
const port = Number(process.env.SERVER_PORT || process.env.PORT || 4000);

const autoBackupHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS || 0);
const autoBackupKeepCount = Number(process.env.AUTO_BACKUP_KEEP_COUNT || 30);
if (autoBackupHours > 0) {
  const tick = async () => {
    try {
      const p = await copyPlatformDatabase();
      const pr = await pruneBackupFiles(
        Number(process.env.PLATFORM_BACKUP_KEEP || autoBackupKeepCount || 30),
      );
      console.log('[auto-backup] OK', p.path, p.sha256?.slice(0, 16) + '…', p.manifestPath || '');
      if (pr.pruned > 0) {
        console.log(`[auto-backup] pruned ${pr.pruned} old backups`);
      }
      await logMasterBackupAudit({
        action: 'platform_backup_auto',
        detail: p.path || '',
        meta: { sha256: p.sha256?.slice(0, 24), pruned: pr.pruned },
      });
    } catch (e) {
      console.error('[auto-backup]', e?.message || e);
    }
  };
  setInterval(tick, autoBackupHours * 3600_000);
  void tick();
}

const pgDumpHours = Number(process.env.PG_DUMP_INTERVAL_HOURS || 0);
if (pgDumpHours > 0) {
  const pgTick = async () => {
    try {
      const r = await runScheduledPgDump();
      if (r.path) {
        console.log('[pg-dump]', r.path);
        await logMasterBackupAudit({
          action: 'pg_dump_scheduled',
          detail: r.path,
          meta: { path: r.path },
        });
      } else if (r.skipped) {
        /* not postgres */
      } else if (r.error) {
        console.warn('[pg-dump]', r.error);
      }
    } catch (e) {
      console.error('[pg-dump]', e?.message || e);
    }
  };
  setInterval(pgTick, pgDumpHours * 3600_000);
  void pgTick();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on 0.0.0.0:${port} (PORT from env)`);
});
