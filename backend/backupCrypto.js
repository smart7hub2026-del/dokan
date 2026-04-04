import crypto from 'crypto';

const MAGIC = Buffer.from('DOKB1', 'utf8');

/** @returns {Buffer | null} 32-byte key or null */
export function loadPlatformBackupAesKey() {
  const hex = String(process.env.PLATFORM_BACKUP_ENCRYPTION_KEY || '').replace(/\s/g, '');
  if (hex.length === 64 && /^[0-9a-fA-F]+$/.test(hex)) {
    return Buffer.from(hex, 'hex');
  }
  const pass = String(process.env.PLATFORM_BACKUP_PASSPHRASE || '').trim();
  if (pass.length >= 8) {
    return crypto.scryptSync(pass, 'dokanyar-platform-backup-salt-v1', 32);
  }
  return null;
}

/**
 * @param {Buffer} plaintext
 * @returns {Buffer} MAGIC + iv(12) + tag(16) + ciphertext
 */
export function encryptBackupBuffer(plaintext) {
  const key = loadPlatformBackupAesKey();
  if (!key) throw new Error('PLATFORM_BACKUP_ENCRYPTION_KEY (64 hex) or PLATFORM_BACKUP_PASSPHRASE required');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, enc]);
}

/**
 * @param {Buffer} blob
 * @returns {Buffer}
 */
export function decryptBackupBuffer(blob) {
  const key = loadPlatformBackupAesKey();
  if (!key) throw new Error('decrypt: no PLATFORM_BACKUP_ENCRYPTION_KEY / PASSPHRASE');
  if (!blob || blob.length < 4 + 12 + 16) throw new Error('decrypt: file too small');
  if (!blob.subarray(0, 4).equals(MAGIC)) throw new Error('decrypt: bad magic');
  const iv = blob.subarray(4, 16);
  const tag = blob.subarray(16, 32);
  const data = blob.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
