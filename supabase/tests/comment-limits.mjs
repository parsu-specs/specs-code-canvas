// Usage: node supabase/tests/comment-limits.mjs <directory containing PGlite's node_modules>
// PGlite is a disposable PostgreSQL engine; this never connects to Supabase.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(resolve(process.argv[2] ?? ".", "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const sql = (path) => readFile(new URL(path, import.meta.url), "utf8");
try {
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    create function auth.role() returns text language sql as
      'select current_setting(''request.jwt.claim.role'', true)';
  `);
  await db.exec(await sql("./storage-fixture.sql"));
  // gen_random_uuid is built into PostgreSQL; pgcrypto is unavailable in this engine.
  await db.exec(
    (await sql("../schema.sql")).replace('create extension if not exists "pgcrypto";', ""),
  );
  await db.exec(await sql("../migration_counters.sql"));
  await db.exec(await sql("../migration_rate_limits.sql"));
  // Reapplying after legacy functions proves they cannot bypass the guards.
  await db.exec(await sql("../migrations/20261021000300_comment_limits.sql"));
  assert.equal(
    (await sql("../migration_comment_limits.sql")).replaceAll("\r\n", "\n").trim(),
    (await sql("../migrations/20261021000300_comment_limits.sql")).replaceAll("\r\n", "\n").trim(),
  );
  await db.exec(await sql("./comment_limits.sql"));
  console.log(
    "PostgreSQL comment guards passed: four-level cap, deleted likes, direct writes, replies, and cleanup.",
  );
} finally {
  await db.close();
}
