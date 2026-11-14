# Sizing calculation audit

Current implementation: Textarea and MarkdownTextarea share native content sizing with manual vertical resizing in unsupported browsers; MarkdownTextarea reserves a three-line minimum. Markdown observes unclipped content. Dropdown uses centered dialogs below 768px and anchored portal popups on larger screens, with plain/icon/check/checkbox variants. Shared `toon-paper` in `src/styles/style.css` supplies clipped paper corners. Flex/grid shrinking, wrapping, container-based form columns, and adaptive image/settings grids remain in place. Responsive CSS expressions, bitmap resizing, and the oversized zoom/overscroll backdrop are retained. The inventory below is the historical 2026-10-20 audit, with original source locations and proposed improvements; it does not describe current code line by line. See [UI conventions](docs/ui-audit.md) for maintained behavior and regression checks.

Reviewed 2026-10-20. Static inspection of application source, styles, public scripts, and entry HTML. No runtime profiling was performed; priorities are candidates, not measured speedups. Application behavior is unchanged.

## JavaScript sizing

| Priority | Location                                       | Current work                                                                                                                                                                                                           | Replacement or improvement                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First    | `src/components/MarkdownTextarea.tsx:15–21`    | On every value change, a layout effect writes `height: auto`, reads `offsetHeight`, `clientHeight`, and `scrollHeight`, then writes height again. This write/read sequence can force synchronous layout before paint.  | Use CSS `field-sizing: content` with explicit width and suitable minimum/maximum height. Feature-detect support and retain the existing effect only as a fallback if older browsers are supported. Verify empty state, placeholder, shrinking after deletion, pasted text, and the height cap.                                                                                                                             |
| Second   | `src/components/PagedMarkdown.tsx:39–52,59–64` | Reads `scrollHeight`, compares with `height + 24`, observes the clipped wrapper, and recreates the observer whenever text or visible height changes. Buttons add/subtract 600px by default, starting at 320px.         | Observe an unclipped inner content wrapper and retain its measured height; derive `hasMore` from that height and the visible limit. Keep observer lifetime independent of See more/less presses. Observing the inner wrapper also catches content changes that do not resize the clipped outer box. A native details element could remove custom paging if changing to a single expand/collapse interaction is acceptable. |
| Low      | `src/components/Dropdown.tsx:57–76,178–184`    | Measures the trigger once when opening, calculates above/below placement, clamps width/left/height into the viewport, then stores coordinates. Closes on external scroll or resize rather than continuously measuring. | Native select removes the custom measurement, portal, and interaction code but changes popup styling. CSS anchor positioning with viewport fallback placement is another option, subject to target browser support and clipping/top-layer behavior. Do not replace the portal with a simple absolute popup: existing card transforms, clipping, and overflow are why it exists.                                            |
| Keep     | `src/utils/images.ts:26–40`                    | Computes aspect-preserving upload dimensions, capped at 800px by default; avatars pass 256px. Draws and encodes the resized bitmap.                                                                                    | Keep this math: it reduces actual uploaded image dimensions. CSS sizing cannot replace bitmap resizing. If upload processing proves slow, investigate decoding, canvas drawing/encoding, and concurrent image processing rather than these few arithmetic operations.                                                                                                                                                      |

Textarea callers: `src/pages/Store.tsx:2047`, `src/components/ProjectView.tsx:833`.

Markdown pager callers: `src/pages/Store.tsx:2216`, `src/components/ProjectView.tsx:85,968`.

Image resize callers: `src/pages/Store.tsx:1312`, `src/components/ProjectView.tsx:416`, `src/components/ProfileView.tsx:327`.

## CSS sizing expressions

These are browser-managed layout expressions. Removing arithmetic syntax alone is not evidence of a performance improvement. Preserve responsive behavior unless profiling identifies a problem.

| Pattern                                                               | All locations                                                                                      | Assessment                                                                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `repeat(auto-fit,minmax(min(100%,18rem),1fr))`                        | `src/pages/About.tsx:53,71`; `src/pages/Store.tsx:2391,2448`; `src/components/ProfileView.tsx:388` | Five adaptive grids. Keep by default. Breakpoint column counts are an alternative design, but change how columns respond to available container width. |
| Fractional columns using `minmax(0, …fr)`                             | `src/pages/Landing.tsx:26`; `src/components/Footer.tsx:17`                                         | Keep. These express column proportions while allowing contents to shrink.                                                                              |
| `max-height: calc(100dvh - 6rem)` and `max-width: calc(100vw - 2rem)` | `src/pages/Store.tsx:1526`                                                                         | Viewport bounds on the menu. Keep; a viewport-constrained wrapper could express bounds differently but changes positioning structure.                  |
| `max-width: calc(100vw - 2rem)`                                       | `src/components/NotificationBell.tsx:138`                                                          | Viewport overflow guard. Keep unless restructuring the popup container.                                                                                |
| `min-height: min(28rem,80vh)`                                         | `src/components/MarkdownFileViewer.tsx:82`                                                         | Responsive viewer minimum. Keep.                                                                                                                       |
| `max-height: min(60vh,32rem)`                                         | `src/components/MarkdownTextarea.tsx:28`                                                           | Responsive editor height cap. Keep even when replacing JS autosizing.                                                                                  |
| `min-width: min(100%,20rem)`                                          | `src/components/NoticeBanner.tsx:31`                                                               | Allows the text block to fit narrow containers while maintaining a preferred minimum. Keep.                                                            |

### Repeated card clipping: 32 source locations

Every location below uses the same polygon with `calc(100% - 36px)` and several `calc(100% + 5px)` coordinates. It makes the decorative cut corner and extends clipping bounds. If profiling finds significant paint cost, compare a simpler card or a corner decoration on a pseudo-element. The new design needs visual checks for shadows, tape, rounded corners, and overflow. Moving the same polygon into a shared class improves maintenance but does not eliminate its rendering work. Tailwind already shares the identical utility rule across uses.

| File                                    | Lines                                          |
| --------------------------------------- | ---------------------------------------------- |
| `src/components/AppCard.tsx`            | 94                                             |
| `src/components/ErrorBoundary.tsx`      | 38                                             |
| `src/components/MarkdownFileViewer.tsx` | 82                                             |
| `src/components/NoticeBanner.tsx`       | 28                                             |
| `src/components/ProfileView.tsx`        | 151, 175, 394, 450                             |
| `src/components/SettingsView.tsx`       | 159, 170, 221, 264                             |
| `src/components/ProjectView.tsx`        | 73, 464, 483, 634, 1132, 1145, 1154            |
| `src/pages/About.tsx`                   | 57, 119                                        |
| `src/pages/Landing.tsx`                 | 64, 119                                        |
| `src/pages/Login.tsx`                   | 298                                            |
| `src/pages/Store.tsx`                   | 1835, 2383, 2419, 2448, 2522, 2726, 2830, 2886 |

### Related viewport sizing

`src/styles/tailwind.css:201–223` uses a fixed `body::before` backdrop with `inset: -100vmax`, `100vw` background sizing, and `100vmax` background positioning. This creates a very large decorative box. Compare a viewport-sized backdrop (`inset: 0`) if paint profiling warrants it; first check why oversizing was used, including overscroll and mobile viewport behavior. Any benefit would come from reducing painted/rasterized area, not removing multiplication in CSS units.

Ordinary percentage widths, fractional utilities, viewport height caps, SVG view boxes, aspect ratios, and centering transforms are also browser sizing mechanisms. There is no general benefit to replacing them with fixed pixels.

## Math excluded from sizing candidates

- Vote, like, cheer, reply-count, pagination, and upload-count clamps are application data limits.
- `AppCard.tsx:84` uses `Math.hypot` for the pointer movement threshold, not dimensions.
- `MentionInput.tsx` and `Dropdown.tsx` clamp keyboard selection indices; mention cursor offsets are string positions.
- Time/countdown arithmetic, ranking, audio synthesis, and notification counts do not size layout.
- Body overflow locking and scroll/focus helpers do not calculate dimensions.

## Suggested validation

Record typing/pasting a long README in browser Performance tools before and after replacing textarea autosizing. Inspect forced reflow and layout duration. Separately compare See more/less interactions, dropdown opening, and scrolling a card-heavy page on a slower mobile device. Measure image processing as an upload task, separately from rendering. No speedup should be claimed from this static audit alone.

References: [forced synchronous layout](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing), [field-sizing](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing), [CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning).
