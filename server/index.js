import 'dotenv/config';
import app from './app.js';
import { copyPlatformDatabase, pruneBackupFiles } from './backupPlatformDb.js';

const port = Number(process.env.PORT || 4000);

const autoBackupHours = Number(process.env.AUTO_BACKUP_INTERVAL_HOURS || 0);
const autoBackupKeepCount = Number(process.env.AUTO_BACKUP_KEEP_COUNT || 30);
if (autoBackupHours > 0) {
  const tick = async () => {
    try {
      const p = await copyPlatformDatabase();
      const pr = await pruneBackupFiles(autoBackupKeepCount);
      console.log('[auto-backup] OK', p);
      if (pr.pruned > 0) {
        console.log(`[auto-backup] pruned ${pr.pruned} old backups`);
      }
    } catch (e) {
      console.error('[auto-backup]', e?.message || e);
    }
  };
  setInterval(tick, autoBackupHours * 3600_000);
  void tick();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`API server listening on 0.0.0.0:${port} (PORT from env)`);
});
