# Project stages and version history

Submission requires a project stage: Concept, Visual prototype, Working prototype,
Beta, or Released. Version labels are optional for the first publication. The form
suggests v0.1 for prototypes, v0.9 for Beta, and v1.0 for Released, while allowing
creators to choose another label. Stages can be skipped or revisited.

**Edit project details** updates the listing without adding history. **Publish an
update** requires a stage, a new version label, and 1–2000 characters describing
the changes. Both keep the same project URL, likes, comments, and original creation
date. Published history includes the stage, label, notes, timestamp, and a snapshot
of the title, description, screenshots, documentation, and project/repository links.
Subsequent edits do not change published snapshots. Version labels are unique per
project; v1.0 and 1.0 count as the same label.

Existing projects retain an unspecified stage and empty history until their owners
choose a stage or publish a tracked update. No previous releases are inferred.

## Supabase setup

Before deploying the frontend to an existing database, apply
[`20261113000100_project_versions.sql`](../supabase/migrations/20261113000100_project_versions.sql)
after the existing auth and project-image migrations. Fresh installations include
the same SQL in `schema.sql`. No live database is modified by repository changes.

The migration adds the stage/version/publication fields to `apps` and the public,
read-only `project_versions` table. Owner-authorized writes to `apps` create a
snapshot through database triggers in the same transaction. Duplicate labels or
invalid publications roll back the whole write. The client uses the last
publication timestamp as a conditional write to reject stale publications.

Historical snapshots retain their screenshot objects. The reference-check RPC
checks both the current listing and published snapshots before image removal.
Deleting a project cascades its history and attempts cleanup of all its images.

Local mode stores the same history within the project's localStorage record;
large histories can reach the browser storage limit, in which case the save fails
without replacing the previous record.

## Custom HTTP server contract

The HTTP adapter forwards `stage` and `version` on creation and editing. A publish
update is `PATCH /apps/:id` with the normal changed fields plus:

```json
{
  "stage": "Working prototype",
  "version": "v0.2",
  "publication": {
    "notes": "Core interactions now work",
    "expectedPublication": "2026-11-13T08:00:00.000Z"
  }
}
```

Omit `expectedPublication` for legacy projects without a tracked publication.
The server must authorize the owner, validate stage/version/notes, compare the
expected timestamp, enforce unique labels, and atomically save the listing and
snapshot. Reject stale or duplicate publications with HTTP 409. Ordinary PATCH
requests must not change the version label or add history.

App responses include `stage`, `version`, and `last_published_at`. Detail and update
responses also include `versions`, newest first, with the domain fields `id`,
`stage`, `version`, `notes`, `publishedAt`, and `snapshot`. Snapshot fields use
`title`, `description`, `screenshots`, `docs`, `url`, and `repoUrl`. List responses
can omit `versions`. The custom server is maintained outside this repository.
