# Architecture

CodeCanvas is a React 18, TypeScript, and Vite app styled with Tailwind CSS v4. It uses Phosphor icons, locally bundled Nunito/Fredoka fonts, and `react-markdown` with GFM for documentation. Backend selection happens at build/startup through `VITE_DATA_SOURCE`.

## Project structure

```text
src/
  pages/        Main router, PublicSite/HomePage/About, Login, Store shell and pages
  components/   Shared controls, cards, views, markdown, dialogs, notifications
  auth/         Session provider and local account definitions
  data/         Repository contracts, factory, local/Supabase/HTTP adapters
  utils/        URLs, markdown imports, ranking, time, palettes, notifications
  styles/       style.css: Tailwind theme, shared utilities, notebook canvas
  experiments/  Optional typography, border, surface, and seasonal treatments
build/          Backend alias selection, initial HTML shell, route preload hints
supabase/       Database schema and incremental migrations
public/         Static assets and font-only cache worker
docs/           Maintained setup, architecture, backend, UI, and operations docs
soundEffects/   Bundled notification and vote audio
```

## Routes

`src/pages/routes.ts` defines route constants; `Main.tsx` selects public/authenticated pages, and `Store.tsx` selects authenticated views.

| Route                                  | Behavior                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                    | Public Home for both visitors and signed-in users                         |
| `/landing`, `/home`                    | Compatibility aliases normalized to `/`                                   |
| `/about`                               | Public team information inside the shared PublicSite shell                |
| `/signin`                              | Email/password, Google, signup, recovery; signed-in users go to Discover  |
| `/discover`                            | Search/filter projects and submit projects                                |
| `/apps/:id`                            | Project details and owner editing                                         |
| `/developers`, `/developers/:username` | Developer directory and profile by encoded display name                   |
| `/profile`                             | Current user's profile                                                    |
| `/feeds`                               | Feed posts, optional project attachments, upvotes, and author deletion    |
| `/feed`, `/community`, `/milestones`   | Compatibility aliases normalized to `/feeds`                              |
| `/leaderboard`                         | Ranked developers and projects                                            |
| `/settings`                            | User info, password, appearance, palette, experiments, sound, local reset |

Store routes require sign-in. `/discover/:id` also opens project details as a legacy path. Shared `/apps/:id` and `/developers/:username` destinations are retained through password or OAuth sign-in using sessionStorage, with an in-memory fallback. Signed-in visits to `/signin` resolve to Discover; the public Home remains accessible. Display-name profile URLs change when a developer renames, while stored mention bindings retain the target profile ID.

## Data and authentication

UI domain operations use `AuthRepo`, `AppRepo`, and `ProfileRepo` from `src/data/repositories.ts`, instantiated by `src/data/factory.ts`.

- `local` (default): browser localStorage accounts, profiles, and project/activity data for demonstrations.
- `supabase`: Supabase Auth plus PostgREST/RPCs. Configure the public endpoint and anon key; authorization belongs in database policies/RPCs.
- `http`: adapter for an independently implemented REST server; see [backends](backends.md).

Keep repository methods compatible across all three adapters. Device preferences, notification read state, sounds, and public GitHub/Google integrations use their own utilities; they are separate from domain repository storage.

Supabase Google login uses a provider redirect to `/discover`. Supabase email/password supports signup, signin, password updates, and recovery to `/signin?mode=recovery`. Local mode supports password updates but cannot send recovery emails; HTTP password operations have the [adapter limits](backends.md#http-adapter-limits) documented separately. Turnstile is configured through its public site key when the backend requires CAPTCHA. Local Google handling is demo behavior and must not be treated as server verification.

## Product behavior

- Projects include a validated URL, description, category, collaborators, optional screenshots, and Markdown docs. Owners can edit/delete their projects.
- Project feedback supports likes and four comment levels, including the root. Deleting a comment preserves a placeholder when replies exist; replies remain readable. Feed uses `FeedPost` in the UI/repository contract, with legacy milestone tables/RPCs and HTTP URLs retained underneath.
- Notifications derive from repository activity and device read/arrival state.
- Developer ranking combines project votes with a 20-point bonus per published project; project ranking uses votes.
- Profiles support avatar and theme choices; Settings stores the site palette on the profile and device.
- Settings includes light/dark/system appearance, sound, and optional fluid/bold text, heading/body font pairings, border, edge, glass, and Halloween treatments. Profile and palette/appearance caches are scoped by backend/account; device experiment controls persist locally.
- Project and profile sharing supports links and downloadable photo previews; share controls load when opened.
- Project docs prefer submitted content; otherwise public GitHub repository URLs can supply a README. Publishing allows 50,000 characters of docs; individual repository Markdown files allow 200KB for preview/download.

## UI and validation

`build/dataBackend.ts` selects one adapter through `@data-backend`; Vite and Vitest share the resolver. The initial HTML contains a public branded shell and route placeholders. Cached viewer hints permit early Store preloads but never authorize rendering or API access. Verified Discover sessions warm one catalog request; noncritical pages, submission, sharing, and card comments load on demand. Auth restoration overlaps the bundled-font readiness guard (up to 1.5 seconds). Skeletons reserve space immediately and reveal after 180 ms. The service worker caches fonts only.

Use `src/styles/style.css` for theme tokens and shared card/canvas utilities. Optional experiment styles live beside their controls in `src/experiments/`. Project image encoding and Supabase Storage variants are described in [image optimization](image-optimization.md).

Use the [shared component and responsive layout conventions](ui-audit.md). `design.md` and `agent.md` remain root-level implementation companions.

Tests are colocated as `src/**/*.test.ts`; see the root [command reference](../README.md). Build and typecheck are separate checks. Database policy integration, provider dashboards, and production deployment behavior require verification against their configured environments. Separate admin applications are outside this repository's validation scope.
