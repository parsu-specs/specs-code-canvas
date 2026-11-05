// Usage: node supabase/tests/vote-spam.mjs <directory containing PGlite's node_modules>
// PGlite is a disposable PostgreSQL engine; this never connects to Supabase.
//
// Regression test for the spam-vote pause. The original check_vote_spam()
// raised an exception right after inserting the vote_timeouts row, so the
// whole RPC transaction rolled back and the pause never persisted — a page
// refresh cleared the restriction. Every toggle below runs as its own
// committed call (exactly like separate PostgREST requests from the
// browser), proving the pause survives ACROSS calls, refreshes, and devices.
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

  // ── BURST: 5 toggles within 10 seconds ───────────────────────────────────
  // Four rapid toggles are fine (parity: on, off, on, off → no vote lands).
  for (let i = 0; i < 4; i += 1) {
    const result = await toggle();
    assert.equal(result.pause_started, false);
  }
  assert.equal(await scalar("select votes from apps where id = $1", [APP]), 0);
  // The fifth rapid toggle trips the burst tripwire: the vote is rejected…
  const tripped = await toggle();
  assert.equal(tripped.pause_started, true);
  assert.ok(tripped.paused_seconds > 290 && tripped.paused_seconds <= 300);
  assert.equal(tripped.liked, false);
  assert.equal(await scalar("select votes from apps where id = $1", [APP]), 0);
  assert.equal(await scalar("select count(*) from app_votes where user_id = $1", [USER]), 0);
  // …and THE PAUSE PERSISTS in its own transaction. The original bug raised
  // on this very call, rolled the insert back, and the restriction vanished
  // the moment the page refreshed.
  assert.equal(await scalar("select count(*) from vote_timeouts where actor_id = $1", [USER]), 1);
  const left = await scalar("select vote_timeout_seconds()");
  assert.ok(left > 290 && left <= 300, `unexpected remaining ${left}`);

  // The next call — a fresh "page load" — bounces off the committed pause.
  await assert.rejects(() => toggle(), /Voting is paused for another/);
  // Paused calls report without logging — no hit-table spam.
  assert.equal(await scalar("select count(*) from rate_hits where actor_id = $1", [USER]), 5);

  // ── EXPIRY: the pause lifts after 5 minutes ──────────────────────────────
  // Simulate the time passing: age out the hits, expire the pause.
  await db.query(
    "update rate_hits set created_at = now() - interval '1 minute' where actor_id = $1",
    [USER],
  );
  await db.query(
    "update vote_timeouts set until = now() - interval '1 second' where actor_id = $1",
    [USER],
  );
  const resumed = await toggle();
  assert.equal(resumed.pause_started, false);
  assert.equal(resumed.liked, true);
  assert.equal(await scalar("select votes from apps where id = $1", [APP]), 1);
  assert.equal(await scalar("select count(*) from vote_timeouts where actor_id = $1", [USER]), 0);

  // ── SUSTAINED: 10 toggles chained by 2–5 second gaps ─────────────────────
  // Nine backdated hits ending 3s ago plus this call trip the chain rule
  // (burst never fires: only 4 hits sit inside the 10s window, this included).
  await db.query("delete from rate_hits where actor_id = $1", [USER]);
  for (let i = 1; i <= 9; i += 1) {
    await db.query(
      "insert into rate_hits (actor_id, action, created_at) values ($1, 'vote:toggle', now() - ($2 || ' seconds')::interval)",
      [USER, String(3 * i)],
    );
  }
  const chained = await toggle();
  assert.equal(chained.pause_started, true);
  assert.equal(chained.liked, true); // the resumed vote from EXPIRY still stands
  assert.ok((await scalar("select vote_timeout_seconds()")) > 290);
  await assert.rejects(() => toggle(), /Voting is paused for another/);

  // ── SIGN-IN: anonymous calls never reach the counter ─────────────────────
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await assert.rejects(() => toggle(), /Sign in to vote/);

  console.log(
    "PostgreSQL spam-vote guard passed: burst and sustained trips reject the vote, the pause persists across calls (survives page refreshes), expiry restores voting, and anonymous calls bounce.",
  );
} finally {
  await db.close();
}
