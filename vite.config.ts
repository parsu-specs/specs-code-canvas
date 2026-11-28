import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { dataBackendAlias, dataSource } from "./build/dataBackend.ts";
import { storePreload } from "./build/storePreload.ts";

export default defineConfig(({ mode }) => ({
  resolve: { alias: dataBackendAlias(mode) },
  build: {
    // The HEIC decoder is a single, optional dynamic-import chunk (~3.2 MB).
    // Keep warning on unexpectedly larger chunks while accepting that decoder.
    chunkSizeWarningLimit: 3500,
  },
  plugins: [
    react(),
    storePreload(
      dataSource(mode),
      process.env.VITE_SUPABASE_URL ??
        loadEnv(mode, process.cwd(), "VITE_").VITE_SUPABASE_URL ??
        "local",
    ),
  ],
  server: {
    port: 3000,
  },
}));
