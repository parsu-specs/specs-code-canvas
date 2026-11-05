import { defineConfig } from "vitest/config";
import { dataBackendAlias } from "./build/dataBackend.ts";

export default defineConfig(({ mode }) => ({
  resolve: { alias: dataBackendAlias(mode) },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
