import "dotenv/config";
import { defineConfig } from "prisma/config";

/** پیش‌فرض برای prisma generate وقتی DATABASE_URL در env نیست (لوکال با Docker Compose) */
const databaseUrl =
  String(process.env.DATABASE_URL || "").trim() ||
  "postgresql://postgres:postgres@127.0.0.1:5432/dokanyar";

export default defineConfig({
  schema: "server/prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
