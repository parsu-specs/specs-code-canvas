# Development setup

## Install and run

1. Clone the repository and enter its root directory (the directory containing `package.json`).
2. Run `npm install` with a Node version supported by the installed Vite release.
3. Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell).
4. Choose a backend below, then run `npm run dev` and open http://localhost:3000.

Vite reads environment configuration at startup; restart after changes. `.env` and `dist/` are ignored by Git. Never place service-role keys or OAuth client secrets in browser variables.

## Local demo (default)

Leave `VITE_DATA_SOURCE` unset or set it to `local`. Accounts, profiles, and projects persist in this browser's localStorage. Register with email/password. A Google button requires a valid `VITE_GOOGLE_CLIENT_ID`; email signup works without it. Settings offers a local project/activity reset.

Local accounts can update their password in Settings, but the demo cannot send password recovery emails.

## Supabase

Set `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Apply the SQL described in [backends](backends.md). Enable email/password and, if needed, Google in Supabase Auth. Google uses the Supabase redirect flow; allow the development/production origin with `/discover`, and the recovery destination `/signin?mode=recovery`. Configure provider credentials in the appropriate dashboards.

If Supabase CAPTCHA is enabled, configure the matching `VITE_TURNSTILE_SITE_KEY`; its secret belongs in Supabase. The site key is public. Test signup, signin, and password recovery against the selected environment.

## Custom HTTP backend

Set `VITE_DATA_SOURCE=http` and `VITE_API_URL` to a server implementing the [repository endpoint contract](backends.md). This repository supplies the browser adapter, not that server.

HTTP password recovery/change, password detection, comment-like notification lookups, and vote-timeout queries are not wired up in the current adapter. Configure the deployed Content Security Policy's `connect-src` to allow your API origin; `vercel.json` currently lists the bundled providers, not an arbitrary REST host.

## Before submitting changes

```sh
npm run format
npm run format:check
npx tsc --noEmit
npm test
npm run build
```

Review both [design.md](../design.md) and [agent.md](../agent.md) for every implementation change. Verify responsive screens using the checklist in [UI audit](ui-audit.md).
