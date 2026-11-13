// Usage: node supabase/tests/project-versions.mjs <directory containing PGlite node_modules>
// Disposable PostgreSQL checks; never connects to a live project.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(resolve(process.argv[2] ?? ".", "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const sql = (path) => readFile(new URL(path, import.meta.url), "utf8");
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const cover = `https://images.example/storage/v1/object/public/project-images/${owner}/v1/old/cover`;
const scalar = async (query, params = []) =>
  Object.values((await db.query(query, params)).rows[0])[0];
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
  const schema = (await sql("../schema.sql")).split(
    "-- Apply after the existing project/auth/image migrations.",
  )[0];
  await db.exec(schema.replace('create extension if not exists "pgcrypto";', ""));
  await db.query(
    "insert into apps(id,title,description,creator,creator_id,category,color) values ('legacy','Legacy','Existing project','Owner',$1,'Creative','sky')",
    [owner],
  );
  const migration = await sql("../migrations/20261113000100_project_versions.sql");
  await db.exec(migration);
  await db.exec(migration);
  assert.equal(await scalar("select count(*) from project_versions where app_id='legacy'"), 0);
  assert.equal(await scalar("select stage from apps where id='legacy'"), null);

  await db.exec(
    "grant select on profiles to authenticated; grant select, insert, update, delete on apps to authenticated; set role authenticated",
  );
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await db.query(
    "insert into apps(id,title,description,creator,creator_id,category,color,stage,version,screenshots,docs) values ('versioned','Original','First design','Owner',$1,'Creative','sky','Visual prototype','v0.1',$2,'Initial docs')",
    [owner, JSON.stringify([cover])],
  );
  assert.equal(await scalar("select count(*) from project_versions where app_id='versioned'"), 1);
  const initialTime = await scalar("select last_published_at::text from apps where id='versioned'");
  await db.exec(
    "update apps set title='Corrected', screenshots='[]', docs='New docs' where id='versioned'",
  );
  assert.equal(
    await scalar("select snapshot->>'title' from project_versions where app_id='versioned'"),
    "Original",
  );
  assert.equal(
    await scalar("select last_published_at::text from apps where id='versioned'"),
    initialTime,
  );
  assert.equal(await scalar("select project_image_is_referenced($1)", [cover]), true);
  await assert.rejects(
    db.exec("update apps set version='v0.2' where id='versioned'"),
    /Publish an update/,
  );
  await assert.rejects(
    db.exec("update apps set stage='Unknown' where id='versioned'"),
    /apps_stage_valid/,
  );
  await assert.rejects(
    db.exec(
      "update apps set version='v0.2', stage='Beta', publication_id=gen_random_uuid(), publication_notes=' ' where id='versioned'",
    ),
    /Describe what changed/,
  );
  await assert.rejects(
    db.exec(
      "update apps set title='Must roll back', version='0.1', stage='Beta', publication_id=gen_random_uuid(), publication_notes='Duplicate' where id='versioned'",
    ),
    /project_versions_label/,
  );
  assert.equal(await scalar("select title from apps where id='versioned'"), "Corrected");
  await db.exec(
    "update apps set stage='Working prototype', version='v0.2', publication_id=gen_random_uuid(), publication_notes='Core interactions work' where id='versioned'",
  );
  assert.equal(await scalar("select count(*) from project_versions where app_id='versioned'"), 2);
  assert.equal(
    await scalar(
      "select snapshot->>'docs' from project_versions where app_id='versioned' and version='v0.2'",
    ),
    "New docs",
  );
  const stale = await db.query(
    "update apps set version='v1.0', publication_id=gen_random_uuid(), publication_notes='Stale' where id='versioned' and last_published_at=$1 returning id",
    [initialTime],
  );
  assert.equal(stale.rows.length, 0);
  await assert.rejects(
    db.exec("delete from project_versions where app_id='versioned'"),
    /permission denied/,
  );
  await assert.rejects(db.exec("update project_versions set notes='Changed'"), /permission denied/);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
  const unauthorized = await db.query(
    "update apps set version='v3.0', publication_id=gen_random_uuid(), publication_notes='Unauthorized' where id='versioned' returning id",
  );
  assert.equal(unauthorized.rows.length, 0);
  await db.exec("reset role; set role anon");
  assert.equal(await scalar("select count(*) from project_versions where app_id='versioned'"), 2);
  await db.exec("reset role; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await db.exec("delete from apps where id='versioned'");
  assert.equal(await scalar("select count(*) from project_versions where app_id='versioned'"), 0);
  assert.equal(await scalar("select project_image_is_referenced($1)", [cover]), false);
  console.log(
    "Project version SQL passed: replay, legacy rows, atomic snapshots, duplicate/stale rejection, owner authorization, immutable public history, retained images, and deletion cascade.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
