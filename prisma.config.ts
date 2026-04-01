import "dotenv/config";
import { defineConfig } from "prisma/config";

/** پیش‌فرض برای prisma generate روی CI/Vercel وقتی DATABASE_URL در env نیست */
const databaseUrl =
  String(process.env.DATABASE_URL || "").trim() || "file:./server/prisma/dev.db";

export default defineConfig({
  schema: "server/prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
