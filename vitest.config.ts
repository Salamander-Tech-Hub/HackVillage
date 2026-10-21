import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        external: ["next", "next/server"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "frontend").replace(/\\/g, "/"),
      "@backend": path.resolve(__dirname, "backend").replace(/\\/g, "/"),
    },
  },
});
