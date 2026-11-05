// Usage: node supabase/tests/debounced-votes.mjs <directory containing PGlite node_modules>
// Disposable PostgreSQL regression checks; never connects to Supabase.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const require = createRequire(resolve(process.argv[2] ?? ".", "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const sql = (path) => readFile(new URL(path, import.meta.url), "utf8");

const USER = "00000000-0000-0000-0000-0000000000aa";
const APP = "vote-spam-app";

async function scalar(text, params) {
  const { rows } = await db.query(text, params);
  return rows[0][Object.keys(rows[0])[0]];
}
async function toggle() {
  const { rows } = await db.query("select toggle_app_vote($1) as result", [APP]);
  const value = rows[0].result;
  return typeof value === "string" ? JSON.parse(value) : value;
}

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
  // Load order mirrors the runbook: rate limits first (rate_hits table), the
  // spam gate last so its guarded toggle_app_vote wins.
  await db.exec(await sql("../migration_rate_limits.sql"));
  await db.exec(await sql("../migration_spam_votes.sql"));
  await db.exec(await sql("../migration_counters.sql"));
  await db.query(
    "insert into apps (id, title, description, creator, category, color) values ($1, $2, $3, $4, $5, $6)",
    [APP, "Spam Guard Test", "Disposable fixture", "Tester", "Productivity", "yellow"],
  );
  // Session-level impersonation: every later query() is its own committed
  // transaction, exactly like separate PostgREST calls from the browser.
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [USER]);
  await db.query("select set_config('request.jwt.claim.role', 'authenticated', false)");

  await db.query(
    "insert into milestones (id, author_id, author_name, body) values ('feed', $1, 'Tester', 'Update')",
    [USER],
  );
  await db.query(
    "insert into vote_timeouts (actor_id, until) values ($1, now() + interval '5 minutes')",
    [USER],
  );
  await db.exec(await sql("../migration_debounced_votes.sql"));
  // Re-running the migration is safe.
  await db.exec(await sql("../migration_debounced_votes.sql"));
  assert.equal(await scalar("select vote_rate_limit_enabled()"), false);
  assert.equal(await scalar("select vote_timeout_seconds()"), 0);
  assert.equal(await scalar("select count(*) from vote_timeouts"), 1);

  const setVote = async (liked) => {
    const { rows } = await db.query("select set_app_vote($1, $2) as result", [APP, liked]);
    return rows[0].result;
  };
  const cheer = async (liked) => {
    const { rows } = await db.query("select set_milestone_cheer('feed', $1) as result", [liked]);
    return rows[0].result;
  };
  for (let i = 0; i < 40; i++) {
    const liked = i % 2 === 0;
    for (let repeat = 0; repeat < 2; repeat++) {
      const vote = await setVote(liked);
      assert.equal(vote.liked, liked);
      assert.equal(vote.row.votes, Number(liked));
      const post = await cheer(liked);
      assert.equal(post.liked, liked);
      assert.equal(post.row.cheers, Number(liked));
    }
  }
  assert.equal(
    await scalar("select count(*) from rate_hits where action in ('vote:toggle', 'cheer:toggle')"),
    0,
  );
  assert.equal(await scalar("select count(*) from app_votes where app_id = $1", [APP]), 0);
  assert.equal(
    await scalar("select count(*) from milestone_cheers where milestone_id = 'feed'"),
    0,
  );
  await assert.rejects(() => db.query("select set_app_vote('missing', true)"), /Project not found/);
  await assert.rejects(
    () => db.query("select set_app_vote($1, null)", [APP]),
    /Vote state is required/,
  );

  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await assert.rejects(() => setVote(true), /Sign in to vote/);
  await assert.rejects(() => cheer(true), /Sign in to cheer/);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [USER]);

  // Existing pause and limiter implementation are still available when re-enabled.
  await db.exec(
    "create or replace function vote_rate_limit_enabled() returns boolean language sql immutable as $$ select true $$;",
  );
  assert.ok((await scalar("select vote_timeout_seconds()")) > 0);
  await assert.rejects(() => setVote(true), /Voting is paused/);
  await db.query("delete from vote_timeouts where actor_id = $1", [USER]);
  for (let i = 0; i < 4; i++) await toggle();
  const tripped = await toggle();
  assert.equal(tripped.pause_started, true);
  assert.ok((await scalar("select vote_timeout_seconds()")) > 0);
  console.log(
    "Debounced votes SQL passed: idempotent likes/unlikes, exact counters, limiter disabled without losing history, sign-in checks, and re-enabled spam detection.",
  );
} finally {
  await db.close();
}
