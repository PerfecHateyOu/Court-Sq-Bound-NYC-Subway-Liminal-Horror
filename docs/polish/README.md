# Polish pass: what changed, what went, what stayed

A sprite, menu and UI polish pass on LAST LOCAL (issue #80), not a redesign. No gameplay changes,
the save format is the same, and the offline copy still runs with no network. One PR per
section, stacked in order: #81 (§0) → #82 (§1) → #83 (§2) → #84 (§3) → #85 (§4) → #86 (§5) →
#87 (§6) → #88 (§7, with these screenshots).

## Screenshots

`before/` is `main` at 300c8d5; `after/` is the top of the stack. One contact sheet per viewport,
in the order: title, Settings, Case Files (Anomalies, Polaroids, Tapes, Endings), the HUD in the
practice stretch, a choice, Pause, the Evidence Log, the Travel Report. Regenerate with
`cd e2e && POLISH_OUT=<dir> npx playwright test -c polish.config.ts` and
`python3 docs/polish/contact-sheets.py <before dir> <after dir>`.

| Viewport | Before | After |
|---|---|---|
| 1920×1080 | [before](before/1920x1080.jpg) | [after](after/1920x1080.jpg) |
| 1440×900 | [before](before/1440x900.jpg) | [after](after/1440x900.jpg) |
| 1280×720 | [before](before/1280x720.jpg) | [after](after/1280x720.jpg) |
| 1024×768 (touch) | [before](before/1024x768.jpg) | [after](after/1024x768.jpg) |
| 768×1024 (touch) | [before](before/768x1024.jpg) | [after](after/768x1024.jpg) |
| 390×844 (touch) | [before](before/390x844.jpg) | [after](after/390x844.jpg) |
| 360×740 (touch) | [before](before/360x740.jpg) | [after](after/360x740.jpg) |
| 844×390 (touch) | [before](before/844x390.jpg) | [after](after/844x390.jpg) |
| 740×360 (touch) | [before](before/740x360.jpg) | [after](after/740x360.jpg) |

## What changed

**§0 Tokens.** Every repeated color, the font stacks and three small type sizes are Tailwind v4
`@theme` tokens (`bg-ink`, `text-cream/90`, `border-paper-line`, `text-2xs`…); 466 of 517 hex
classes replaced. Pixel-identical to `main`.

**§1 Bugs.** Settings' header reachable on short screens (and the same fix for the print
viewers); Board the Train above the fold on phones; Case Files tabs as a 2×2/4-up tablist;
"ARCHIVE DOSSIER"; the practice coach docks under the HUD (`--hud-h`) and is compact in short
landscape; every control at least 44px on touch and 32px with a mouse (`e2e/tap-targets.spec.ts`);
Car A/B/C everywhere.

**§2 Responsive system.** `src/ui/Overlay.tsx` is the one modal shell: sticky header/footer, only
the body scrolls, a bottom sheet on touch phones held upright, focus trap, Esc, focus returned,
a 150–200ms open animation that Reduced turns off. Input-based variants (`touch:`, `short-land:`,
`calm:` for Reduced), `h-dvh`, safe areas, `clamp()` headings.

**§3 Menus.** Title hierarchy (one primary, one row of secondaries, one locked row); one Controls
block for the current input only, from `src/ui/controls.ts` (also used by the coach and the HUD
hints). Settings in five groups with fixed-width values, focus rings and Start rides muted.
Case Files: 4-up stats, anomaly cards grouped by class, one status chip shared with the Evidence
Log. Pause: Restart set apart in red with its confirm, 2×2 in short landscape. Choices: 48px
stacked buttons on touch, key caps on desktop. Travel Report: one stat table, a badge row, Ride
Again first, then Case Files and Title.

**§4 HUD.** One station card (line, next stop; chapter and car; the heartbeat as a strip); 40/44px
tool circles with tooltips, labels only on Camera and Evidence, a divider before the system
controls; key hints only while they're useful; a filling ring and a pulse on the FLAG button; a
travel ring and snap-back on the WALK stick; the HUD dims to 40% when idle.

**§5 Characters and textures.** Hands attached at the wrist; phones held in both hands, dark with a
lit screen toward the face; faces set into the head with glasses that sit on it and a faint jaw
shade; long hair with side lengths; woven cloth on every garment with a seeded per-passenger
variation; seeded breathing. Static parts merged per material and identical materials shared:
**scene meshes 1117 → 760, draw calls in the default seated view 114 → 88.** Signs, ads and maps at
the screen's pixel ratio (≤2×) with trilinear mipmaps and anisotropy everywhere; station names go
to two lines instead of shrinking below ~30px; ad margins; varied decals; a seamless floor.

**§6 Cleanup** and **§7 Accessibility**: see below.

## What was removed, and why

| Item | Now | Why |
|---|---|---|
| Debug overlay checkbox on the title | Gone; the overlay is compiled out of production; backquote toggles it in `vite dev` | Spoilers in the player UI |
| Start muted checkbox on the title | Settings → Audio → Start rides muted (saved) | A setting, not a title action |
| Four sets of control instructions | One list, `src/ui/controls.ts`, filtered by input | They drifted apart |
| LAST LOCAL wordmark in the HUD, separate CH. and CAR pills | One station card | Redundant; three pills in a row |
| "Sound" label in the HUD | Icon with a tooltip | Only Camera and Evidence have counters and shortcuts worth a label |
| "MTA NYCTliminal ARCHIVE DOSSIER" | "ARCHIVE DOSSIER" | Spacing bug, noise |
| "[Anomaly parameters not yet witnessed]" on every card | A redaction bar per card, the hint once | Thirteen identical rows |
| Two Polaroid empty states | One, with "Press C on the train to take one." | Same thing, two messages |
| "Return to Briefing" | "Close" | It closes a panel |
| Screen-effects helper paragraph | One line: "Screen tearing, breathing and heartbeat line. Following your device: On." | — |
| JetBrains Mono (Google Fonts and the offline embed) and `.glitch-text` | Removed | Nothing used them: `font-mono` was always the system stack |
| Offline fonts | Archivo Latin only, subset to the glyphs used (`scripts/subset-fonts.py`): 352 KB → 107 KB | Offline `index.html` 1.50 MB → 1.28 MB, zip 571 KB → 394 KB |

**Stat names.** "Sanity Retained", "Mask Integrity" and "Anomaly Accuracy" are different measures,
so each keeps its name and gets a one-line tooltip on the report. "Psychological Log" on the report
is the same file as Case Files → Anomalies; its heading says so.

**Bundles** (production build, bytes): app JS 312,707 → 321,495; CSS 69,719 → 85,514; three
539,471 → 543,213 (`mergeGeometries`); react unchanged. three is already tree-shaken (`import * as
THREE` is a namespace import rollup shakes); the WebXR code (`XRWebGLLayer`,
`createProjectionLayer`) is part of `WebGLRenderer` itself and can't be dropped without patching
three. The app has no `console.log`; the one in the bundle is three's own logger.

## What was deliberately left alone

- **No backdrop blur on the HUD.** The brief asks for `backdrop-blur-sm`; the note at the top of
  `HUD.tsx` records that a blur behind each panel halved the frame rate in profiling. The glass is
  `bg-black/60` with one border and one shadow instead. Short-lived panels still blur.
- **No catch pulse that knows you were right.** The FLAG pulse fires on every registered flag, the
  same for right and wrong: flags are private and there is no real-time oracle.
- **No head-tilt toward the phone for Mom and Dad.** Their heads are the game (they watch you);
  carLife already leans, sways and gives other passengers habits. Breathing is the only new motion,
  ±0.4%, perfectly regular, off under Reduced and for the still figures.
- **Skin colours aren't varied.** An anomaly recolours Mom's skin and restores her exact colour.
- **Dark trousers stay dark.** The floor bounce is raised a little; the rest of the darkness is the
  trousers' own colour, and lifting it with emissive cloth would glow during blackouts.
- **Restart from the practice stretch still confirms** (it skips the rest of the lesson); restarting
  a chapter practice run (nothing saved) doesn't.
- **Texture disposal:** nothing is rebuilt at runtime. Stations, signs and the trial scene are built
  once and redrawn in place, so there's nothing to leak.
- **The `ym()` in the brief** isn't in this source; it's a minifier name. The equivalent is
  `hudNeedsLiveRefresh` in `App.tsx`, which the idle dim (`hudIdle`) extends.
- **The 51 single-use hex shades** stay as they are; a token for each would be noise.
- **The live 3D scene, the station sign hero, the three-rule briefing, the dossier styling, the
  heartbeat line, the parody ads and every anomaly, ending and tape** are untouched in content.

## Accessibility (§7)

Contrast, measured: `dim` #9a9684 on `ink` 6.4:1 and on `panel` 6.3:1 (it isn't used on paper);
CLASS labels on paper use `paper-dim` (5.7:1); "hold to catch" is cream/80 on the button (9.7:1).
Fixed: `paper-mute` (inactive tabs, empty states) 4.3 → 4.9:1; white on the red buttons 4.4 → 4.9:1;
grey captions on paper and `white/40` text on dark panels moved to passing tokens; the HUD key hints
are cream/80 on the glass. Every focusable thing shows a focus ring; ride shortcuts don't fire
behind the Evidence Log; Reduced turns off every new motion (panel transitions, the HUD dim fade,
breathing, the FLAG pulse, the WALK ease, the hint fade).
