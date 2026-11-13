# Data backends and HTTP contract

The default backend is browser localStorage. Supabase Auth/PostgREST and custom HTTP adapters are also implemented; select one with `VITE_DATA_SOURCE`. These instructions describe configuration, not the live deployment state.

Vite selects the backend through `@data-backend` at build time, keeping unused SDKs and demo data out of startup. Restart the dev server or rebuild after changing `VITE_DATA_SOURCE`. Vitest shares the same resolver; TypeScript checks the common repository contract through the local adapter mapping.

## What is already backend-shaped

- UI code only touches `AuthRepo` / `AppRepo` / `ProfileRepo` (`src/data/repositories.ts`).
  Domain data stays behind repository interfaces; device preferences use dedicated utilities.
- `VITE_DATA_SOURCE=local` (default) keeps everything as-is. `supabase` switches
  every screen to `src/data/supabase/` (live Supabase Auth + PostgREST, anon key).
  `http` switches to `src/data/http/` for a custom REST backend (needs `VITE_API_URL`).
- `supabase/schema.sql` mirrors every prototype store as real tables with RLS.

## Backend configuration

1. Create the Supabase project. Run `supabase/schema.sql` in the SQL editor.
2. Auth: Authentication → Providers → enable **Google** with your Google Cloud
   OAuth client ID + secret, and add `http://localhost:3000/discover` (plus the
   production URL later) under URL Configuration → Redirect URLs.
   Then set `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, and
   `VITE_SUPABASE_ANON_KEY` in `.env` and restart.
   Note: Supabase Auth issues fresh UUID identities, so the cloud database starts
   empty — prototype ids (`user-1`, `google-<sub>`) do not transfer. Migrate rows
   to the new ids at finalize time using an explicit migration.
3. Images: new project screenshots use separate compressed thumbnail/cover objects
   in the public `project-images` Storage bucket. Existing databases must apply
   `supabase/migrations/20261103000100_project_images.sql`; fresh setups include
   it in `schema.sql`. See [image optimization](image-optimization.md) for sizing,
   migration, caching, and the compact inline fallback while setup is pending.
4. For the custom HTTP backend only, implement this endpoint contract. Supabase mode uses its SDK/PostgREST/RPCs directly and does not require this REST server:
   - `GET /auth/session` → `{ user }` (401 when signed out)
   - `POST /auth/signin {email, password}` → `{ user, token }`
   - `POST /auth/signup {name, email, password}` → `{ user, token }` (existing email, case-insensitive → 409 `{ message }` naming the clash, never a second account)
   - `POST /auth/google {accessToken}` → `{ user, token, picture? }`.
     Server MUST fetch Google userinfo itself and match verified email → account.
     Never trust client-sent claims.
   - `POST /auth/signout` → 204 · `PATCH /auth/name {name}` → `{ user }`
   - `GET /apps?query=&category=&limit=&offset=` → `{ apps }` (server fills
     `viewer_has_voted` / `comments_count` from the session)
   - `GET /apps/:id` → `{ app }` · `POST /apps` → `{ app }`
     · `PATCH /apps/:id` → `{ app }` (owner only) · `DELETE /apps/:id` → 204
   - `POST /apps/:id/vote` → `{ app }` (toggle)
   - `PUT /apps/:id/vote {liked: boolean}` → `{ app }` (idempotent desired state used by the UI)
   - `GET /apps/:id/voters` → `{ voters }` (profiles of upvoters, any order)
   - `GET /apps/:id/comments` → `{ comments }` (flat, `parent_id` nests replies)
   - `POST /apps/:id/comments {body, parentId?}` → `{ comment }`
   - `POST /apps/:id/comments/:commentId/like` → `{ comment }` (toggle)
   - `DELETE /apps/:id/comments/:commentId` → 204 (author only; preserve a deleted placeholder when replies exist, otherwise remove the row; replies survive)
   - `GET /milestones` → `{ milestones }` (newest first)
   - `POST /milestones {body, appId?}` → `{ milestone }`
   - `DELETE /milestones/:id` → 204 (author only)
   - `GET /milestones/:id/voters` → `{ voters }` (profiles of feed upvoters, any order)
   - `POST /milestones/:id/cheer` → `{ milestone }` (toggle)
   - `PUT /milestones/:id/cheer {liked: boolean}` → `{ milestone }` (idempotent desired state used by the UI)
   - `GET /profiles` → `{ profiles }` · `GET /profiles/:id` → `{ profile }`
   - `GET /profiles/by-name/:name` → `{ profile }` (404 → null)
   - `POST /profiles/ensure {id, email, name}` → `{ profile }`
   - `PATCH /profiles/:id` → `{ profile }` (owner only; reject role changes)
   - Errors as `{ message }` with proper HTTP status (404 drives not-found UI).

   New profiles must start as `Guest`. Only `Member` accounts approved through
   the separate admin console may call `POST /apps`; check the authenticated
   account in the API, not caller-supplied role data. Guest feed posting remains
   available. See [account roles](account-roles.md) for the shared database contract.

5. For the custom server option, set `VITE_DATA_SOURCE=http` and `VITE_API_URL=https://<your-api>` in `.env`.
6. Review the rate-limit, vote-guard, authorship, and constraint migrations in `supabase/`. Configure Auth CAPTCHA and provider settings in the target environment. Verify policies with authenticated and unauthorized requests before releasing.

### HTTP adapter limits

`src/data/http/httpRepos.ts` is the implemented client contract; `rows.ts` defines its snake_case response fields. Requests use JSON and a bearer token persisted under `cc.api_token.v1`, with a default 10-second timeout. Implement authorization and final validation on the server. Display-name lookup and other not-found errors must retain `404` in the returned error message because the adapter currently identifies missing rows from that text.

Password recovery and password changes currently throw unavailable errors in HTTP mode; `hasPassword()` returns false. No recovery/password request is sent. `listCommentLikers()` returns an empty map, so comment-like notifications are unavailable; `getVoteTimeoutSeconds()` returns zero. Adding server endpoints alone does not enable these features: the adapter must also be connected to them. Local and Supabase behavior should be checked separately.

The repository API names feed records `FeedPost` (`listFeedPosts`, `postFeedPost`, `deleteFeedPost`, `setFeedPostCheer`). The HTTP wire contract intentionally retains `/milestones` and `{ milestone }` / `{ milestones }` payloads. UI navigation uses `/feeds`.

For deployment with a separate API origin, extend `connect-src` in `vercel.json` and configure server CORS for the frontend origin. The supplied policy does not allow arbitrary HTTP backends.

## SQL changes

Review `supabase/schema.sql` and each migration header. Apply migrations in dependency order, not an assumed alphabetical order: legacy profile-claim support must precede its retirement in `migration_drop_claim.sql`; counter and vote protections must be applied in their intended sequence. For an existing database, inspect what is already applied and back up first. Do not blindly rerun all files after the consolidated schema.

Comment threads allow four levels, including the top-level comment. For existing Supabase databases, apply `migration_comment_limits.sql` after `migration_comment_placeholders.sql`. The equivalent CLI migration is `migrations/20261021000300_comment_limits.sql`; fresh databases receive the guards from `schema.sql`. Deleted placeholders cannot receive likes, while their replies can. Older threads deeper than four levels remain readable, but cannot receive deeper replies. A custom HTTP backend must enforce the same rules.

To test the SQL without connecting to Supabase, install `@electric-sql/pglite` in a temporary directory, then run `node supabase/tests/comment-limits.mjs <temporary-directory>`. The runner loads the schema and migrations into disposable PostgreSQL and runs `supabase/tests/comment_limits.sql`.

## Local demo boundaries

Local Google account claims and browser password storage are demo behavior. Production identity verification and authorization belong in Supabase or the custom server. Local demo IDs are not interchangeable with Supabase UUID identities.

See [setup](setup.md) for environment configuration and [runbook](runbook.md) for backup/recovery.

## Permanent mentions

For existing databases, run `supabase db push` to apply
`supabase/migrations/20261022000100_mentions.sql` before deploying this client.
For manual SQL Editor application, use the identical `supabase/migration_mentions.sql`.
Fresh installations include it in `schema.sql`. Apps and comments now return a `mentions`
JSON array of `{ name, userId }`: the posted label and permanent target profile ID.
The database captures bindings on insert and retains prior bindings during text edits.
The HTTP adapter sends the same metadata; custom servers must persist it and return it
on app/comment reads, and preserve prior bindings when updating descriptions.

Legacy posts are backfilled against currently identifiable profile names without rewriting
text. Mentions made before a previous rename cannot be reliably reconstructed without
historical identity data. Browser storage snapshots legacy bindings before profile edits.
Missing or deleted targets stay plain text and never redirect to another account.

### Debounced upvotes

Apply `supabase/migration_debounced_votes.sql` after the spam-vote and counter migrations
(or deploy `supabase/migrations/20261022000200_debounced_votes.sql`) before shipping the UI.
It adds `set_app_vote` and `set_milestone_cheer`, disables project and feed upvote throttling, and leaves the spam detection
implementation and history intact. Comment like and posting limits stay enabled.

Project cards and details share a 500 ms trailing debounce per user/project. Clicks update
immediately; a burst ending at the confirmed state performs no write. Saves send an explicit
liked/unliked state, serialize requests, and retain newer intent while a request is running.
Feed upvotes use the same debounce. Failed saves restore the last confirmed state and show the error. Pending saves survive
route changes within the app; closing the browser before the debounce finishes can discard them.

To restore the previous limiter, change SQL `vote_rate_limit_enabled()` to return true and
set `VOTE_RATE_LIMIT_ENABLED` in `src/utils/debouncedVotes.ts` to true.

HTTP backends must also support `PUT /milestones/:id/cheer` with `{ liked: boolean }`,
returning `{ milestone }` with the final counter and viewer state.

## Project versioning

Existing Supabase databases must apply `supabase/migrations/20261113000100_project_versions.sql` before deploying the versioning UI. See [project versioning](project-versioning.md) for stage fields, atomic publication snapshots, retained images, and the extended HTTP contract.
