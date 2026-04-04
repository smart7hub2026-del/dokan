import { prisma } from './storage.js';

/**
 * لاگ جدا و قابل جستجو برای عملیات بکاپ/اسنپ‌شات master.
 * @param {{ action: string, detail?: string, actorShopCode?: string, actorSub?: string, meta?: object, ip?: string }} p
 */
export async function logMasterBackupAudit(p) {
  try {
    await prisma.masterBackupAuditLog.create({
      data: {
        action: String(p.action || 'unknown'),
        detail: p.detail != null ? String(p.detail).slice(0, 4000) : '',
        actorShopCode: p.actorShopCode != null ? String(p.actorShopCode) : null,
        actorSub: p.actorSub != null ? String(p.actorSub) : null,
        meta: p.meta && typeof p.meta === 'object' ? p.meta : undefined,
        ip: p.ip != null ? String(p.ip).slice(0, 64) : null,
      },
    });
  } catch (e) {
    console.error('[master-backup-audit]', e?.message || e);
  }
}
