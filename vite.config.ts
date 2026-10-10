import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const DEFAULT_API_PROXY_TARGET = "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => {
  // Only VITE_-prefixed values are loaded. Never add secrets here: anything
  // prefixed with VITE_ is compiled into the public browser bundle.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiProxy = {
    "/api": {
      target: env.VITE_DEV_API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      clearMocks: true,
      restoreMocks: true,
    },
  };
});
