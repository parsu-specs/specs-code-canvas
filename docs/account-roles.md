Accounts have two public roles:

- **Guest**: the default for new accounts; can browse and post to the feed.
- **Member**: approved by an administrator; has Guest access and can submit projects.

`profiles.role` stores `Guest` or `Member`. Users cannot change it through profile editing or direct database requests. On first application, the migration resets existing profile roles to Guest, including old Member text, because the previous field was self-editable and cannot prove approval. Administrators then approve Members through the console. Rerunning the migration preserves those approvals and the existing administrator roster.

Apply `supabase/migrations/20261113000300_account_roles.sql` to the main Supabase database after the existing migrations. Fresh installations must apply it after `schema.sql` as well. No live database changes are performed by editing this repository.

The separate [admin console](https://github.com/jj-rmr/admin-app-store-specs) already checks `admins.user_id` for access. This migration uses that same table and preserves its policies. Bootstrap administrators through trusted SQL using their Supabase Auth UUID; public profile roles never grant console access. There is no Admin role or administration interface in the public app.

To approve an account, an allowlisted administrator can open Users in the console, select an account, and choose Manage role. Select Member to approve project submissions or Guest to revoke access, then save. The same dropdown is available under Database → profiles. New profiles default to Guest, and the console API accepts only Guest and Member. Changes are recorded in the admin audit log. Profile approval does not add anyone to the admins table. The console must use the same Supabase project. Refresh the public app after approval to load the new role.

The local demo also defaults new accounts to Guest and checks stored membership before submission. Browser storage is a development backend, not an authorization boundary. HTTP deployments must enforce these same rules in their API; the public client never sends role updates.

For bulk changes, select accounts using the Users row checkboxes or the header checkbox, then choose Promote to Member or Demote to Guest. The console waits ten seconds before writing; Undo cancels the pending batch.

Both applications share one database. Use **this repository** (`specs-code-canvas`) as the Supabase CLI migration source. The versioned bulk migration is `supabase/migrations/20261113000400_admin_account_roles.sql`, after account roles; the admin repository's `supabase/migration_admin_account_roles.sql` is an identical SQL Editor alternative. The existing admin moderation migration must already be applied.

From this repository's root, inspect and apply pending migrations with:

```powershell
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
```

The admin checkout does not have a separate versioned migration history. Do not run shared-database migration commands from that checkout or reset the remote history to match it. If the history is mismatched even from the main checkout, inspect the version list and restore the missing original files before changing any history records. A history repair only marks migrations as applied or reverted; it does not execute their SQL.
