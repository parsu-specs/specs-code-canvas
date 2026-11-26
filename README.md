# CodeCanvas

**A home for what you build.**

CodeCanvas is a community platform for discovering and sharing digital creations: software applications, websites, games, utility scripts, automation tools, AI agent skills, reusable software components, and other digital resources.

Publish creations with project links, screenshots, and documentation to demonstrate what they do. Connect with fellow developers and potential users through feedback, discussions, project updates, technical questions, and collaborative learning.

CodeCanvas is an initiative by the **Society of Programmers and Enthusiasts in Computer Science (SPECS)**. Its roots in a community of computer science students and alumni inform the initiative, while projects and shared learning lead its public identity.

See the [product and branding guide](docs/branding.md) for positioning, supported creations, and organization attribution.

## Getting started

```sh
npm install
```

Copy `.env.example` to `.env`, then run:

```sh
npm run dev
```

Open http://localhost:3000. The default `local` backend stores demo accounts and data in this browser. Create an account with email/password; Google sign-in requires configuration. See [setup](docs/setup.md) for backend-specific instructions.

Home (`/home`) and About (`/about`) are public. Sign in to browse Discover, developer profiles, Feed (`/feeds`), the leaderboard, and Settings. Shared project and developer links return to their destination after sign-in.

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

- [Product and branding](docs/branding.md): positioning, supported creations, and SPECS attribution.
- [Setup](docs/setup.md): local development and environment configuration.
- [Architecture](docs/architecture.md): routes, features, data layers, authentication, and project structure.
- [Backends](docs/backends.md): Supabase setup and custom HTTP endpoint contract.
- [Image optimization](docs/image-optimization.md): upload budgets, responsive variants, and Supabase Storage setup.
- [Runbook](docs/runbook.md): deployment recovery and incident response.
- [UI conventions and audit](docs/ui-audit.md): shared components and responsive layouts.
- [Design decisions](design.md) and [agent instructions](agent.md): implementation conventions.

## Privacy

CodeCanvas handles account details (such as email, name, and profile information),
content users submit, and authentication/session data needed to operate the service.
The data stored and processed depends on the deployment: the local demo stores data
in this browser's `localStorage`; a hosted deployment may use Supabase Auth,
Postgres, and Storage, Google sign-in, or a separately configured HTTP backend.
Those providers may process data under their own policies. Operators should identify
the active providers, retention periods, contact, and any analytics or cookies in a
deployment-specific privacy notice. Do not submit sensitive personal information.

This project README is not a complete privacy notice or legal advice. Before
operating CodeCanvas for real users, publish a notice that accurately describes the
specific deployment, its data practices, user rights, and contact information.

## Terms of use

Use CodeCanvas lawfully and respectfully. You are responsible for the content you
submit and must have the rights needed to share it. Do not post unlawful, infringing,
misleading, abusive, or malicious content, or attempt to disrupt or gain unauthorized
access to the service. Public posts and profile information may be visible to other
users. Service operators may moderate or remove content and suspend access to
protect users or comply with law. The service is provided without warranties to the
extent permitted by law; operators should publish deployment-specific terms and
contact information before launch.

These summary terms are not a complete agreement or legal advice. The operator of
each deployed instance is responsible for its applicable terms and policies.

## License

This repository is licensed under the **BSD 3-Clause License**; see
[`LICENSE`](LICENSE). It permits redistribution and modification, including
commercial and closed-source derivatives, provided the license conditions are met.
It does not require derivatives or new features to remain free or open source, so it
does not guarantee the project's original goal that derivatives stay free. The
endorsement restriction also prohibits using the SPECS name or contributors' names
to promote derived products without prior written permission.

Each contributor retains copyright in their own contributions. Contributions are
distributed under BSD 3-Clause, and contributor attribution should be maintained
without implying that copyright in one contributor's work transfers to another.

CodeCanvas is an initiative by the Society of Programmers and Enthusiasts in
Computer Science (SPECS). Under BSD 3-Clause, SPECS receives the same ongoing
permission as any recipient to use, modify, and distribute the licensed source and
derivatives, subject to the license conditions. These permissions attach to the
licensed work and are not limited to the organization's current name. This notice
does not create special founder control over other contributors' work; any such
arrangement would need a separate written agreement.

Third-party dependencies, fonts, icons, and other assets retain their own licenses
and notices; this project's license does not replace or override them. Review each
dependency's license and preserve required notices when redistributing. The package
manifest and lockfile list dependencies but are not a complete third-party license
inventory.

Edit `src/data/team.ts` for shared product copy, creation types, organization attribution, the About page roster, and contact information. The organization logo is `public/specs-logo.png`. The root PDF is a historical snapshot; maintained Markdown documentation is authoritative.
