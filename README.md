# CodeCanvas by SPECS

A community app store by SPECS, a computer science student organization, where student developers publish software, exchange feedback, find collaborators, and share progress.

## Getting started

```sh
npm install
```

Copy `.env.example` to `.env`, then run:

```sh
npm run dev
```

Open http://localhost:3000. The default `local` backend stores demo accounts and data in this browser. Create an account with email/password; Google sign-in requires configuration. See [setup](docs/setup.md) for backend-specific instructions.

Home (`/`) and About (`/about`) are public. Sign in to browse Discover, developer profiles, Feed (`/feeds`), the leaderboard, and Settings. Shared project and developer links return to their destination after sign-in.

## Commands

| Command                | Purpose                              |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start Vite on port 3000              |
| `npm run build`        | Build to `dist/`; does not typecheck |
| `npx tsc --noEmit`     | Check TypeScript                     |
| `npm run preview`      | Preview the production build         |
| `npm test`             | Run Vitest                           |
| `npm run format`       | Format maintained files              |
| `npm run format:check` | Check formatting                     |

## Documentation

Start with the [documentation index](docs/README.md).

- [Setup](docs/setup.md): local development and environment configuration.
- [Architecture](docs/architecture.md): routes, features, data layers, authentication, and project structure.
- [Backends](docs/backends.md): Supabase setup and custom HTTP endpoint contract.
- [Image optimization](docs/image-optimization.md): upload budgets, responsive variants, and Supabase Storage setup.
- [Runbook](docs/runbook.md): deployment recovery and incident response.
- [UI conventions and audit](docs/ui-audit.md): shared components and responsive layouts.
- [Design decisions](design.md) and [agent instructions](agent.md): implementation conventions.

Edit `src/data/team.ts` for the About page roster, feature copy, and contact information. The root PDF is a historical snapshot; maintained Markdown documentation is authoritative.
