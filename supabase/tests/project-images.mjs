// Usage: node supabase/tests/project-images.mjs <directory containing PGlite node_modules>
// Disposable PostgreSQL checks. Never connects to a live Supabase project.
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
const cover = `https://images.example/storage/v1/object/public/project-images/${owner}/v1/image/cover`;
const object = `${owner}/v1/image/cover`;
const scalar = async (query, params = []) => {
  const { rows } = await db.query(query, params);
  return Object.values(rows[0])[0];
};
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
  await db.exec(
    (await sql("../schema.sql")).replace('create extension if not exists "pgcrypto";', ""),
  );
  await db.exec(await sql("../migrations/20261103000100_project_images.sql"));
  assert.equal(await scalar("select public from storage.buckets where id='project-images'"), true);
  assert.equal(
    Number(await scalar("select file_size_limit from storage.buckets where id='project-images'")),
    1048576,
  );
  await db.query(
    "insert into apps(id,title,description,creator,creator_id,category,color,screenshots) values ('image-project','Images','Fixture','Other',$1,'Productivity','sky',$2)",
    [other, JSON.stringify([`${cover}#w=1600&h=900`, `${cover}?old=1#dimensions`])],
  );
  await db.exec("grant select on public.apps to authenticated; set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await db.query("insert into storage.objects(bucket_id,name) values ('project-images',$1)", [
    object,
  ]);
  assert.equal(await scalar("select count(*) from storage.objects"), 1);
  assert.equal(await scalar("select public.project_image_is_referenced($1)", [cover]), true);
  assert.equal(
    await scalar("select public.project_image_is_referenced($1)", [cover + "-unused"]),
    false,
  );
  await assert.rejects(
    db.query("insert into storage.objects(bucket_id,name) values ('project-images',$1)", [
      `${other}/v1/forbidden/cover`,
    ]),
    /row-level security/i,
  );
  assert.equal(
    (await db.query("update storage.objects set name='overwritten' returning name")).rows.length,
    0,
  );
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
  assert.equal(await scalar("select count(*) from storage.objects"), 0);
  assert.equal((await db.query("delete from storage.objects returning name")).rows.length, 0);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  assert.equal((await db.query("delete from storage.objects returning name")).rows.length, 1);
  await db.exec("reset role; delete from apps where id='image-project'; set role authenticated");
  assert.equal(await scalar("select public.project_image_is_referenced($1)", [cover]), false);
  console.log(
    "Project image SQL passed: bucket configuration, migration replay, owner-only immutable writes/deletes, and shared URL reference checks.",
  );
} finally {
  await db.close();
}
