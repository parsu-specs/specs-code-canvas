// node supabase/tests/account-roles.mjs <directory containing PGlite node_modules>
// Disposable PostgreSQL only; never connects to a live project.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const require = createRequire(resolve(process.argv[2] ?? ".", "package.json"));
const { PGlite } = require("@electric-sql/pglite");
const db = new PGlite();
const guest = "11111111-1111-4111-8111-111111111111";
const admin = "22222222-2222-4222-8222-222222222222";
const scalar = async (sql) => Object.values((await db.query(sql)).rows[0])[0];
const login = async (id) => {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
};
try {
  await db.exec(`
    create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    create function auth.role() returns text language sql as
      'select nullif(current_setting(''request.jwt.claim.role'', true), '''')';
    grant usage on schema auth to authenticated;
    create table profiles(id text primary key, name text not null, role text not null default 'Community member');
    create table apps(id text primary key, creator_id text not null);
    create table milestones(id text primary key, author_id text not null);
    alter table profiles enable row level security;
    alter table apps enable row level security;
    alter table milestones enable row level security;
    create policy own_profiles on profiles for all using (id = auth.uid()::text) with check (id = auth.uid()::text);
    create policy own_apps on apps for all using (creator_id = auth.uid()::text) with check (creator_id = auth.uid()::text);
    create policy own_feed on milestones for insert with check (author_id = auth.uid()::text);
    grant select, insert, update, delete on profiles, apps, milestones to authenticated;
    insert into profiles values ('${guest}', 'Guest user', 'Community member');
    insert into profiles values ('${admin}', 'Console admin', 'Admin');
    insert into profiles values ('legacy-member', 'Previously approved', 'Member');
  `);
  const migration = await readFile(
    new URL("../migrations/20261113000300_account_roles.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  assert.equal(await scalar(`select role from profiles where id='${guest}'`), "Guest");
  assert.equal(await scalar(`select role from profiles where id='${admin}'`), "Guest");
  assert.equal(await scalar("select role from profiles where id='legacy-member'"), "Guest");
  await db.exec(`
    insert into admins(user_id) values ('${admin}');
    create function console_admin() returns boolean language sql security definer set search_path=public
      as 'select exists(select 1 from admins where user_id=auth.uid()::text)';
    create policy console_updates on profiles for update using (console_admin());
    create policy console_reads on profiles for select using (console_admin());
    grant select, insert, update, delete on admins to authenticated;
  `);
  await db.exec("select set_config('request.jwt.claim.role', 'authenticated', false)");
  await login(guest);
  await db.exec(`update profiles set name='Renamed Guest' where id='${guest}'`);
  await assert.rejects(
    db.exec(`update profiles set role='Member' where id='${guest}'`),
    /admin console/,
  );
  await assert.rejects(
    db.exec(`update profiles set role='Admin' where id='${guest}'`),
    /admin console/,
  );
  await assert.rejects(
    db.exec(`insert into admins(user_id) values ('${guest}')`),
    /row-level security/,
  );
  await assert.rejects(db.exec(`insert into apps values ('guest-project','${guest}')`), /approve/);
  await db.exec(`insert into milestones values ('guest-feed','${guest}')`);
  await db.exec(`delete from profiles where id='${guest}'`);
  await assert.rejects(
    db.exec(`insert into profiles values ('${guest}','Guest','Member')`),
    /start as Guest/,
  );
  await db.exec(`insert into profiles(id,name) values ('${guest}','Guest')`);
  assert.equal(await scalar(`select role from profiles where id='${guest}'`), "Guest");
  await login(admin);
  await db.exec(`insert into apps values ('console-project','${admin}')`);
  await db.exec(`update profiles set role='Member' where id='${guest}'`);
  await assert.rejects(
    db.exec(`update profiles set role='Admin' where id='${guest}'`),
    /profiles_account_role_valid/,
  );
  await db.exec("reset role");
  await db.exec(migration);
  assert.equal(await scalar(`select role from profiles where id='${guest}'`), "Member");
  await login(guest);
  await db.exec(`insert into apps values ('member-project','${guest}')`);
  await assert.rejects(
    db.exec(`update profiles set role='Guest' where id='${guest}'`),
    /admin console/,
  );
  await login(admin);
  await db.exec(`update profiles set role='Guest' where id='${guest}'`);
  await login(guest);
  await assert.rejects(
    db.exec(`insert into apps values ('revoked-project','${guest}')`),
    /approve/,
  );
  await db.exec(`insert into milestones values ('still-can-post','${guest}')`);
  console.log(
    "Account roles: defaults, migration reruns, self-promotion, admin approval/revocation, roster isolation, project submission and Guest feed posting passed.",
  );
} finally {
  await db.close();
}
