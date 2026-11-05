# UI conventions and project audit

## Shared component rules

| Need                                                        | Component                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| Standard actions and action links                           | `Button`, `ButtonLink`                                        |
| Custom icon controls, menu options, palette cards, switches | `Button` icon/menu variants; `plain` for bespoke compositions |
| Checkbox / file input                                       | `Checkbox`, `FileInput` from `Input.tsx`                      |
| File chooser label                                          | `ButtonLabel` wrapping or targeting a native file input       |
| Text/search/password fields                                 | `Input`                                                       |
| Native form selections                                      | `Select` from `Input.tsx`                                     |
| Multiline text                                              | `Textarea` from `Input.tsx`                                   |
| Growing Markdown editor                                     | `MarkdownTextarea`                                            |
| Filter listbox                                              | `Dropdown`                                                    |
| Product lockup, profile picture, project card               | `Brand`, `Avatar`, `AppCard`                                  |

Standard calls to action use the primary/secondary/surface Button variants, including ?Submit your first project.? Use the shared icon, menu, text, and filter variants instead of repeating their visual styles. Filters support both `aria-pressed` and tab `aria-selected` states. Reserve `plain` for bespoke compositions such as palette cards, image triggers, and switches.

Navigation/action links use `ButtonLink`, preserving anchor semantics and destinations. `Checkbox` and `FileInput` from `Input.tsx` retain native checked, disabled, file, and ref behavior without text-field styling. `ButtonLabel` shows focus around nested upload controls; separate file controls can use a peer focus indicator. Native interactive tags are confined to the Button/Input primitives; semantic layout HTML and Markdown renderer output remain native.

## Responsive layout fixes

- Native viewport pinch/trackpad zoom is enabled. The viewport meta has no scale limit, and the document has no pinch-blocking CSS or gesture listeners. Image-viewer pinch/drag handling remains scoped to its image surface.

- Loading placeholders reserve their layout immediately and appear only after 180 ms. Fast responses bypass visible loading. Slow responses use page-specific skeletons and short opacity fades; reduced-motion users receive no fade or pulse.
- Discovery uses the same auto-fill grid for cards and skeletons: single columns and lone results are centered, while multi-column rows (including incomplete final rows) align left. Browser checks at 320, 390, 600, 768, 1024, and 1440px found no horizontal overflow or layout shift in the delayed-data scenario.
- The build emits a public branded startup shell and route-specific placeholders into the initial HTML, restoring saved palette/appearance before painting and starting the Store download before the main script executes. No private content is pre-rendered.
- A local compressed-production check with a mocked backend, 150 ms network latency, 200 KB/s download, and 4x CPU slowdown measured mobile FCP around 1.2 s and LCP around 3.3 s, with CLS 0. These are synthetic checks, not a new Lighthouse measurement of the deployed site; remeasure the deployed URL after publication.

- Project, profile, About, and developer collections use component-owned Tailwind grid utilities: `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`. Columns adapt to the content container instead of the viewport alone.
- Discovery app cards and profile project cards fill their grid track up to `max-w-sm` (24rem / 384px at the default root size), preventing sparse results from becoming oversized.
- Grid children can shrink below their intrinsic text width. Paper cards wrap long unbroken user content; AppCard headings and action rows can wrap.
- Screenshot upload previews use adaptive tracks with an 8rem preferred minimum; screenshot galleries use an 18rem preferred minimum and settings tiles use 16rem. They follow container width instead of viewport breakpoints.
- The breadcrumb appears with the desktop sidebar at `lg`; its trail wraps. It no longer reserves a sidebar margin on tablets while the sidebar is absent.
- Footer and landing split tracks use `minmax(0, ...)` to permit shrinking. Landing navigation wraps; leaderboard rows can wrap on mobile.
- Theme medal/trophy colors are centralized in the CSS theme. Form controls share Input sizing and styling through the shared primitives. Component styles live in Tailwind classes; global CSS is limited to theme tokens and document/browser defaults.
- Dropdown uses the restored styled portal popup, positioned above or below the trigger and constrained to the viewport. Shared Button controls provide the trigger/options; the checkbox variant uses the shared native Checkbox. Escape, outside pointer interaction, external scrolling, and resize dismiss the popup; selection and Escape return focus. Arrow keys and Home/End navigate options; native checkboxes support Space and Tab.
- Flex/grid containers and direct children have local shrinking constraints; controls and rows have maximum widths and wrap long text/actions. Nested submission, project-edit, and profile-edit forms use the named `content` container at 36rem, including matching column spans.
- Paper surfaces retain the restored clipped upper-right polygon, tape, and shadows through component-owned Tailwind utilities. Keep controls and focus indicators clear of the cut corner. Discovery cards do not rotate into adjacent tracks.
- MarkdownTextarea uses native `field-sizing: content` where supported. Its legacy fallback resizes after value or width changes; both paths cap height at `min(60dvh,32rem)` before scrolling internally.
- PagedMarkdown observes an unclipped inner wrapper, independently of visible paging height. The final content is fully revealed without the former 24px tolerance.
- Breadcrumb actions use semantic buttons instead of clickable labels.

## Sizing validation (2026-10-20)

Headless Edge checks covered nine application routes at 280, 320, 360, 390, 640, 768, 1024, and 1440 CSS pixels. No viewport overflow or browser runtime errors were found in those checks. A separate pass used long unbroken project names, profile names/roles, descriptions, URLs, Markdown, and comments at 280, 390, 768, 1024, and 1440px, including project/profile editing, mobile account and notification menus, and sign-in/signup. That pass also completed without detected overflow or runtime errors.

Component browser checks verified stepped Markdown expansion/collapse, complete final content visibility, detection after resizing, native select changes, textarea growth/shrinkage and capped internal scrolling, and the legacy textarea fallback after both value and width changes. These are functional layout checks in Edge with isolated local data, not measured performance gains or verification on physical iOS/Android devices. External image/provider requests were blocked during the route checks.

## Discover startup performance (2026-11-03)

Store now preloads its static module dependencies together, while share-photo/link
controls and card comments download when opened. The catalog warmup starts after
session verification even with cached fonts, before Store's normal loading effect;
returning to Discover within the same signed-in session does not warm it again.

The Store chunk decreased from 185.0 kB to 131.0 kB before compression. In three
paired headless Edge mobile fixture runs (390px, DPR 2, 4x CPU slowdown, 150 ms
latency, 200 kB/s download, gzip, 24 projects, mocked Supabase), median LCP decreased
from 3.08 s to 2.80 s and initial compressed JavaScript decreased by about 14 kB.
Median FCP was 1.28 s before and 1.26 s after; measured CLS stayed below 0.0001.
The baseline assets were re-minified with the installed Rolldown minifier for this
local comparison. These measurements are synthetic, not a new Lighthouse score
or a claim about live Supabase/CDN performance.

Browser checks verified one initial catalog request, deferred share/comment
downloads, working sharing/photo-preview/comment dialogs, and no mobile overflow
or runtime exceptions. The supplied Lighthouse report also includes browser
extension JavaScript; its minification warning is entirely extension code.

## Documentation maintenance

Image delivery checks (2026-11-03) used production output in headless Edge at 390px
(DPR 2, CPU throttled 4x, simulated 4G) and 1440px, with mocked Supabase responses and
900 ms image delays. Discover requested only thumbnail objects; detail covers and
the fullscreen viewer requested cover objects. Card frames retained identical
dimensions before/after image decode, with zero measured Discover layout shift,
no viewport overflow, and no runtime exceptions. This verifies fixture behavior,
not live CDN performance or physical mobile devices. Native browser encoding of a
473 KB sample PNG produced a 111 KB 1600x900 WebP cover and a 41 KB 768x432 thumbnail;
portrait and avatar bounds were also checked. The image migration passed disposable
PostgreSQL checks for owner policies, immutable writes, replay, and shared references;
the existing comment/vote SQL suites also passed with the Storage fixture.

Maintained documentation now lives under `docs/` with an index and linked root README. Setup distinguishes local, Supabase, and HTTP backends; architecture and companion instructions describe current routes and implemented persistence. Removed stale fixed test counts and claims that a separate admin application's behavior was verified here. The root PDF remains a historical artifact.

## Manual regression checklist

Use 320px, 375px, 768px, 1024px, and 1440px viewports. Browser validation is separate from automated build/type/test checks.

1. Visit Landing, About, Login, Discover, Developers, profile, project detail, Feed, leaderboard, and Settings.
2. Check one-column mobile cards, container-based column changes, long project/profile names and URLs, and wrapped actions without clipped controls.
3. Open project submission/editing, add screenshots, and inspect Markdown previews and two-column form transitions.
4. Confirm mobile top/bottom bars clear content; confirm sidebar/breadcrumb alignment at 1024px.
5. Open each Dropdown variant with keyboard and pointer; verify icons, single selection/checkmarks, multiple checkbox toggles without dismissal, arrow/Home/End navigation, Enter/Space selection, Escape, outside dismissal, focus return, and placement inside clipped cards. Also verify native Select form fields.
6. Check palette selection, password visibility, comments, notifications, and dialog closing with visible keyboard focus.

Live Supabase policy/auth/provider behavior and external admin applications require their own environment checks. This UI/documentation pass does not migrate databases or change backend contracts.

## Dropdown variants

The original checked single-select remains the default for existing callers. Use `variant="default"` for plain rows, `variant="icons"` with Phosphor elements in each option's `icon`, or `variant="check"` for the selected checkmark. These variants accept a string `value` and `(value: string) => void` callback.

```tsx
<Dropdown label="Project" variant="icons" value={project} onChange={setProject}
  options={[{ value: "app", label: "App", icon: <Code size={18} weight="duotone" /> }]} />
<Dropdown label="Status" variant="check" value={status} onChange={setStatus}
  options={statusOptions} />
<Dropdown label="Categories" variant="checkbox" value={categories} onChange={setCategories}
  options={categoryOptions} />
```

The checkbox variant accepts a string array and `(value: string[]) => void` callback. Toggling a checkbox keeps the popup open; the trigger summarizes selected labels. All variants support `placeholder` and `disabled`. The earlier native-select browser checks above describe the previous implementation; the restored popup needs the variant checks listed in the checklist.
