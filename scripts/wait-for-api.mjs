/**
 * قبل از بالا آوردن Vite: تا آماده شدن API روی 127.0.0.1 صبر می‌کند
 * (هم‌خوان با SERVER_PORT / PORT در .env — همان منطق server/index.js)
 */
import 'dotenv/config';
import http from 'node:http';

const port = Number(process.env.SERVER_PORT || process.env.PORT || 4000);
const host = '127.0.0.1';
const healthPath = '/api/health';
const maxMs = Number(process.env.WAIT_FOR_API_MS || 90_000);
const deadline = Date.now() + maxMs;

function ping() {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: host, port, path: healthPath, timeout: 2500 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  process.stderr.write(`[wait-for-api] waiting for http://${host}:${port}${healthPath}\n`);
  while (Date.now() < deadline) {
    if (await ping()) {
      process.stderr.write('[wait-for-api] OK\n');
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  process.stderr.write(
    `[wait-for-api] TIMEOUT — آیا PostgreSQL بالاست و DATABASE_URL درست است؟ (پورت API: ${port})\n`,
  );
  process.exit(1);
}

void main();
