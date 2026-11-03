import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Server Action tests. They need module mocks and the "@/" alias, which the
// node:test files under tests/unit and tests/sql do not.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/actions/**/*.test.ts"],
    environment: "node",
  },
});
