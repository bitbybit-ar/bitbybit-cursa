import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    pool: "threads",
    teardownTimeout: 10000,
    testTimeout: 15000,
    coverage: {
      reporter: ["text", "lcov"],
      include: ["app/api/**", "components/**", "lib/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws at import time outside Next.js to keep
      // server modules out of client bundles. In vitest we ARE in a
      // server context, so replace it with a no-op stub.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
