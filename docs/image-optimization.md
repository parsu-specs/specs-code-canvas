# Image optimization

Project screenshots use separate thumbnail and cover files. Cards, gallery tiles,
and editing previews request thumbnails; project covers use responsive candidates,
and the image viewer loads the full cover. Existing frame sizes, cropping, loading
priority, and opacity transitions stay with their owning components. Intrinsic image
dimensions supplement those frames without changing their layout.

## Encoding

The browser encodes uploads as WebP, falling back to JPEG with a white backing when
WebP encoding is unsupported. Images retain their aspect ratio and are never enlarged.
Quality is reduced before dimensions when a file exceeds its byte budget.

| Use                   | Maximum dimensions   | Encoded byte budget | Initial quality |
| --------------------- | -------------------- | ------------------- | --------------- |
| Project cover         | 1600 wide, 3200 high | 300 KB              | 82%             |
| Project thumbnail     | 768 wide, 1536 high  | 80 KB               | 76%             |
| Profile avatar        | 256 longest side     | 30 KB               | 76%             |
| Pending Storage setup | 800 longest side     | 80 KB               | 76%             |

Input files retain the existing 8 MB limit. `prepareImageInput` accepts browser-readable
images and converts HEIC/HEIF to PNG on-device using the lazy `heic-to/csp` decoder
before preview or WebP/JPEG encoding. The submit project editor offers a full-width
crop preview without padding, plus synchronized slider and percentage number controls.
The encoder loads only when images are selected or persisted; selected files are
processed sequentially to limit concurrent decoding on mobile.

## Supabase setup

For an existing database, apply
[`20261103000100_project_images.sql`](../supabase/migrations/20261103000100_project_images.sql)
through the project's normal migration process. Fresh databases include this setup
in `supabase/schema.sql`. This repository change does not apply SQL to a live project.

The migration creates the public `project-images` bucket, restricts upload/deletion
to the authenticated owner's directory, and adds a reference check used during cleanup.
Project images are public, like the public project catalog; private assets need a
separate bucket and access model.

Objects have immutable paths, `{ownerId}/v1/{uploadId}/cover` and `thumbnail`, and a
one-year cache lifetime. The existing `screenshots: string[]` contract stores the cover
URL with a fragment containing actual dimensions (`w`, `h`, `tw`, `th`). Fragments never
travel in HTTP requests. Only generated paths at the configured Supabase origin are
interpreted as paired variants; external and legacy URLs continue to work as supplied.
No paid image transformation service is needed.

The catalog query returns only the first screenshot and omits documentation. Project
detail queries retain the complete gallery and docs. Cover `srcset` descriptors use
actual encoded widths, and `sizes` accounts for cropping in the existing cover frame.
A missing thumbnail falls back once to the cover without adding a layout wrapper.

If the bucket is absent, new submissions use compact inline images so publishing can
continue while setup is pending. Authentication, policy, and network failures surface
an upload error rather than switching storage modes. After setup, saving an owned
project uploads its existing inline screenshots. Legacy remote URLs are not downloaded
or rewritten; projects that are never edited retain their existing images.

Failed uploads/database writes trigger best-effort cleanup of new objects. After a
successful edit/deletion, cleanup removes only generated files owned by the current
user that are no longer referenced by a project. Cleanup errors preserve files rather
than blocking a completed project save. Storage and database writes are separate
operations, so an interrupted browser can still leave an unreferenced object.

Local and custom HTTP adapters preserve the screenshot string contract and use the
compressed upload previews; Storage variant persistence is implemented by the Supabase
adapter. Avatars remain compact inline images.

## Validation

Run `npm test` and `npx tsc --noEmit` for encoder, rendering, and repository checks.
To exercise the SQL in disposable PostgreSQL, install `@electric-sql/pglite` in a
temporary directory and run `node supabase/tests/project-images.mjs <temporary-directory>`.
The Storage fixture stands in for Supabase-managed tables; it is not a migration.
Live Storage/CDN behavior still needs verification after applying the migration.
