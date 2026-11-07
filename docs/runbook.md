# Incident runbook — CodeCanvas

This repository contains the frontend, backend adapters, Supabase SQL, and Vercel routing/security headers. Confirm deployment names, dashboard access, backups, and incident contacts in the team's private operations directory before release. No admin application or `admin_audit`/`admins` schema is supplied here.

## Roll back a frontend release

1. In the hosting project's deployment history, restore the last known-good deployment. `npm run build` produces `dist/`; `vercel.json` rewrites direct route requests to the app entry point.
2. Verify `/` and `/about` while signed out, then sign in and open `/discover`, `/feeds`, a shared project link, and a shared developer link. Test direct URL loads as well as in-app navigation.
3. A frontend rollback does not undo database migrations or Storage changes. Inspect migration dependencies before choosing a forward fix or database restore; do not assume every SQL file can safely be replayed in any order.

Backend selection and public provider variables are built into the frontend. Rebuild/redeploy after changing environment configuration. Check the CSP when changing provider or custom API origins.

## Back up and restore

For Supabase, verify the target project's configured backups and recovery options. Before manual migrations, take a database backup and test restoration to a separate environment. These example commands use Bash and externally supplied database connection variables:

```bash
pg_dump "$SUPABASE_DB_URL" -Fc -f "codecanvas-backup-$(date +%F).dump"
pg_restore -d "$RESTORE_DB_URL" codecanvas-backup-<date>.dump
```

Restore into a fresh project and verify schema, policies, authentication, and data before repointing the frontend. A database dump does not contain Storage image bytes: back up the public `project-images` objects separately and preserve their paths. Review Auth/provider settings and Storage configuration during recovery. See [image optimization](image-optimization.md) for object layout and cleanup behavior.

Local demo data resides in the browser, and the Settings reset clears local projects/activity. Custom HTTP servers require their own backup procedure.

## First hour of an incident

| Phase     | Action                                                                                                                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detect    | Assign an incident owner. Inspect browser errors, failed network requests, hosting deployment logs, and Supabase Auth/database/Storage logs. Identify the affected backend and release.                                                                               |
| Contain   | For a compromised account, use the configured identity provider's session/account controls. For exposed credentials, rotate the affected credentials and update services/build configuration that use them. Review RLS and Auth protection settings for active abuse. |
| Repair    | Preserve evidence, identify affected rows/objects and policies, and prepare a targeted fix. Validate author-only project/comment/feed deletion and access from unauthorized sessions.                                                                                 |
| Recover   | Deploy the verified fix or known-good frontend. Restore data after assessing loss and testing restoration. Smoke-test signup/signin, project submission, image loading, feedback/replies, upvotes, Feed posting/deletion, sharing, and signout.                       |
| Follow up | Record impact, root cause, recovery actions, and prevention. Update the runbook and assign remaining work.                                                                                                                                                            |

## Monitoring to configure

- Hosting deployment failures and availability checks for public and direct app URLs.
- Supabase Auth failures, database errors, and Storage upload failures.
- Client errors and failed repository requests through the team's chosen monitoring service. `ErrorBoundary` logs exceptions/component stacks to the console; this repository does not configure a remote error collector.
- Periodic backup restore drills and authenticated/unauthorized policy checks.

Dashboard configuration and live alert delivery require environment-specific verification. The supplied SQL test runners use disposable PostgreSQL fixtures; they do not verify live provider or CDN state.
