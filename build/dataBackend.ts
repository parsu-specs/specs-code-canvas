import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

/** Select at build time so unused SDKs and demo data never enter the startup graph. */
export function dataBackendAlias(mode: string) {
  const source = dataSource(mode);
  return {
    "@data-backend": fileURLToPath(new URL(`../src/data/backends/${source}.ts`, import.meta.url)),
  };
}

export function dataSource(mode: string) {
  const source =
    process.env.VITE_DATA_SOURCE ??
    loadEnv(mode, process.cwd(), "VITE_").VITE_DATA_SOURCE ??
    "local";
  if (!["local", "supabase", "http"].includes(source))
    throw new Error(`Unknown data source: ${source}`);
  return source;
}
