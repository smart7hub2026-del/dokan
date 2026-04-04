import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __pkgJson = path.join(path.dirname(fileURLToPath(import.meta.url)), "package.json");
const __pkg = JSON.parse(readFileSync(__pkgJson, "utf-8")) as { version?: string };
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /** هرگز از PORT برای پروکسی استفاده نکن — ممکن است با پورت Vite یا هاست اشتباه شود */
  const apiPort = env.SERVER_PORT || env.VITE_DEV_API_PORT || "4000";

  return {
    define: {
      __APP_VERSION__: JSON.stringify(__pkg.version ?? "0.0.0"),
    },
    plugins: [react(), tailwindcss(), viteSingleFile()],
    optimizeDeps: {
      include: ["jspdf", "jspdf-autotable", "xlsx"],
    },
    test: {
      setupFiles: ["./server/vitest-setup.ts"],
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ||
          "postgresql://postgres:postgres@127.0.0.1:5432/dokanyar_test",
      },
      maxWorkers: 1,
      fileParallelism: false,
      testTimeout: 180_000,
      hookTimeout: 180_000,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      host: true,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
