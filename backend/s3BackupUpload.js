import { readFile } from 'fs/promises';

/**
 * آپلود اختیاری به S3 / سازگار با MinIO (endpoint سفارشی).
 * @param {{ localPath: string, key: string, contentType?: string }} opts
 * @returns {Promise<{ ok: boolean, bucket?: string, key?: string, error?: string }>}
 */
export async function uploadBackupFileToS3(opts) {
  const bucket = String(process.env.S3_BACKUP_BUCKET || '').trim();
  const region = String(process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1').trim();
  const prefix = String(process.env.S3_BACKUP_PREFIX || 'dokanyar-backups').replace(/^\/+|\/+$/g, '');
  if (!bucket) return { ok: false, error: 'S3_BACKUP_BUCKET not set' };

  let S3Client;
  let PutObjectCommand;
  try {
    const mod = await import('@aws-sdk/client-s3');
    S3Client = mod.S3Client;
    PutObjectCommand = mod.PutObjectCommand;
  } catch (e) {
    return { ok: false, error: '@aws-sdk/client-s3 not installed' };
  }

  const body = await readFile(opts.localPath);
  const key = `${prefix}/${opts.key}`.replace(/\/+/g, '/');

  const clientConfig = { region };
  const endpoint = String(process.env.S3_ENDPOINT || '').trim();
  if (endpoint) {
    clientConfig.endpoint = endpoint;
    clientConfig.forcePathStyle = String(process.env.S3_FORCE_PATH_STYLE || 'true') !== 'false';
  }

  const client = new S3Client(clientConfig);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: opts.contentType || 'application/octet-stream',
    }),
  );

  return { ok: true, bucket, key };
}
