/**
 * قبل از import شدن app/storage — Vitest این فایل را زودتر از تست‌ها اجرا می‌کند.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5432/dokanyar_test';
process.env.NODE_ENV = 'test';
