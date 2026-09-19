# COPA Brand Kit

Source of truth for COPA / Playspace visual identity across the web dashboard (this repo) and, later, the Expo mobile app. Every value in this document is backed by a token in `src/lib/design-system.ts` or `tailwind.config.ts` — components must consume tokens, never raw values.

## 1. Brand identity: Coastal Blues

COPA audits real playgrounds and turns fieldwork into evidence. The visual language
reflects the artefact the work produces: **a clean report page** carrying **solid,
unambiguous ink blocks** (stamps, printed labels, hard edges). We call this direction
**Coastal Blues**.

What it means in practice:

- **Paper canvas, ink text.** The dashboard reads like the report it generates: a
  near-white canvas, near-black body copy. Blue carries the brand as an accent - it
  does not tint the background or the body text, and the page does not read as "a blue
  app". Dark mode inverts to a deep blue-black, not a neutral gray.
- **One deep navy carries the system.** `#01497C` is the primary accent; moss, steel
  blue and indigo are supporting accents used sparingly (status, charts, categorical
  colour). Amber is reserved for warnings and stays amber in every mode.
- **Solid blocks, hard edges.** Primary actions, badges, and page headers are solid
  fills with a hard offset "edge" shadow (`0 2px 0 <edge-color>`), so they read as
  physical blocks embedded in the surface. Pressing a button visibly sinks it.
- **Inverted page headers.** The page header is the one deliberately loud element per
  screen: an ink-colored block (`bg-foreground` + `text-background`) with a hard drop
  edge. Everything else stays quiet.
- **Colour is never the only channel.** Status carries a label or icon; the audit
  report's bars are labelled and in fixed order. The categorical palette is still held
  to a colour-vision floor on top of that, because redundancy is the mitigation and not
  an excuse.
- **No wordmark-only lockups.** Brand presence is the icon (`/icon.png`) plus the
  product name set in the heading face - never a standalone decorative wordmark.
- **Minimal, professional, accessible.** WCAG-aware contrast in both themes, a
  dedicated high-contrast mode, dyslexic-font support, and font scaling (0.85-1.3x) are
  part of the brand, not add-ons. The contrast floors are enforced by tests, not by
  review - see *Accessibility rules* below.

## 2. Color tokens

All colors live in **`brand/tokens.json`** - the canonical source for this repo *and* for copa-mobile. `pnpm tokens:build` generates `src/lib/design-system.generated.ts` from it, which `DESIGN_SYSTEM.palettes` consumes in four modes: `light`/`dark` × `standard`/`high` contrast. They are emitted as CSS custom properties and mapped to Tailwind utilities in `src/app/globals.css`.

**Never hard-code hex values in components, and never edit a `*.generated.ts` file** - edit `brand/tokens.json` and regenerate. `pnpm tokens:check` enforces this in CI. Cross-client divergences that predate the pipeline are declared under `knownDrift` in the token file rather than left implicit.

### Ownership across the two repos

This repo **owns** `brand/tokens.json`. `pnpm tokens:build` stamps `meta.checksum` with a hash of the token payload; copa-mobile vendors the stamped file and refuses to build or pass CI when the stamp disagrees with the copy's contents. So colour can only change here, and a local edit on the mobile side is a hard failure rather than a silent divergence.

To change a colour: edit `brand/tokens.json`, run `pnpm tokens:build` and `pnpm docs:build`, then copy the stamped file into copa-mobile and run its `tokens:build` and `node scripts/build-token-baseline.mjs`. Five layers back this up:

| Check | Catches |
| --- | --- |
| `pnpm tokens:check` (both repos) | generated files stale or hand-edited; a stamp that disagrees with the payload |
| copa-mobile `tokens:check` | a vendored copy edited in the mobile repo |
| copa-mobile `verify-token-sync.mjs` | a vendored copy that is merely out of date (needs `TOKENS_SYNC_TOKEN`) |
| `eslint` (`no-restricted-syntax`) | a hard-coded colour, or a raw Tailwind palette class, reaching a component under `src/**` |
| `pnpm docs:check` | the colour tables in this document drifting from the token file |

### What the lint rules allow

Hue-neutral compositing values stay inline: pure black and white at any alpha
(shadows, scrims, overlays) render correctly over any palette, so tokenising them
would be churn. Three files are exempt by design:

| File | Why |
| --- | --- |
| `src/lib/design-system.generated.ts` | Generated from the token file - the values are the point |
| `src/app/global-error.tsx` | Renders when the app has failed, so it must not depend on the token pipeline or on any stylesheet having loaded |

The raw-JSON inspector used to be a third exemption. It is a deliberately always-dark
code pane, so it cannot read the theme custom properties - but that is a reason for it
to have its own token group, not a reason to hand-write hex. It reads the `codeViewer`
group now, and the exemption is gone.

Colours that sit inside Tailwind arbitrary-value class strings (`bg-[radial-gradient(...)]`,
`filter-[drop-shadow(...)]`) cannot take a JS constant. Those are emitted as CSS
custom properties from the token file and referenced with `var(--...)` - see the
`landing` group.

Tailwind's own palette classes (`text-amber-600`, `bg-zinc-950`) are banned outright.
They are the worse leak of the two, because `text-amber-600 dark:text-amber-400` *looks*
theme-aware while ignoring the contrast mode entirely - high-contrast users kept getting
exactly the same pale amber. The token classes resolve per theme **and** per contrast, and
need no `dark:` variant.

<!-- generated:colour-tables -->

### Surfaces & text (semantic roles)

| Role | Token / utility | Light (standard) | Dark (standard) |
| --- | --- | --- | --- |
| App canvas | `bg-background` (`--canvas`) | `#F7F9FB` | `#0E1419` |
| Card surface | `bg-card` (`--surface`) | `#FFFFFF` | `#161D24` |
| Raised surface (popovers) | `bg-surface-raised` | `#FFFFFF` | `#1D262E` |
| Sunken surface (wells, inputs) | `bg-surface-sunken` | `#EDF1F5` | `#0A0F13` |
| Primary text | `text-foreground` (`--text-primary`) | `#14181D` | `#E8EDF2` |
| Secondary text | `text-text-secondary` | `#3A424B` | `#C3CCD6` |
| Muted text | `text-muted-foreground` | `#5C6773` | `#94A1AE` |
| Structural edge | `border-edge` (use `/40`–`/60` opacity) | `#D6DCE2` | `#2E3942` |
| Input border | `border-input-border` | `#7E8A96` | `#627180` |
| Focus ring | `ring-ring` (`--focus`) | `#01497C` | `#61A5C2` |

Text contrast in the standard palettes, against the surface each role sits on:

| Role | Light | Dark |
| --- | --- | --- |
| `--text-primary` | 17.82:1 | 14.43:1 |
| `--text-secondary` | 10.19:1 | 10.47:1 |
| `--text-muted` | 5.76:1 | 6.45:1 |

### Accents

| Accent | Token | Light | Dark | Use |
| --- | --- | --- | --- | --- |
| Deep navy (primary) | `--accent-terracotta` / `bg-primary` | `#01497C` | `#61A5C2` | Primary accent, focus, selection, section-header accent tick |
| Moss | `--accent-moss` | `#0F6B45` | `#5FBF98` | Success-adjacent, categorical |
| Steel blue | `--accent-slate` | `#297596` | `#89C2D9` | Info, categorical; paired `-surface`/`-border` for soft badges |
| Indigo | `--accent-violet` | `#5B4C8A` | `#B3A3D9` | Categorical, stat tones; paired `-surface`/`-border` |

### Categorical colour (audit report bars)

All six render side by side in one chart, so they carry two requirements at once:
each readable on the report's white page, and no two collapsing into each other for a
colour-blind reader. Both floors are asserted in `tests/unit/design-tokens.test.ts`.

| Bar | Value | On white |
| --- | --- | --- |
| Provision | `#0A4A31` | 10.31:1 |
| Variety | `#C2410C` | 5.18:1 |
| Challenge | `#26708F` | 5.53:1 |
| Sociability | `#7C3560` | 8.28:1 |
| Play Value (construct total) | `#4A3F99` | 8.53:1 |
| Usability (construct total) | `#985952` | 5.40:1 |

<!-- /generated:colour-tables -->

### Status colors

`--status-success/warning/danger/pending/in-progress`, each with paired `-surface` and `-border` tokens for soft badges. Status meaning must never be conveyed by color alone — pair with a label or icon.

### Solid blocks

`--solid-primary/neutral/danger/draft/orphan` with matching `-edge` (hard shadow color) and `-text` tokens. These drive the default/secondary/destructive button variants, `bru-*` classes, badges, and active nav items. `solid-primary` is the action color and `--accent-terracotta` is the accent; the two share the deep navy in the light palettes, so an accent tick and a button fill read as the same brand colour rather than two.

### Accessibility rules

- Body text on its surface must meet **WCAG AA 4.5:1**; large headings 3:1. The high-contrast palettes exist for users who need more — never "fix" a standard-palette contrast problem by telling users to switch modes.
- These are enforced, not reviewed. `tests/unit/design-tokens.test.ts` asserts that every
  text role clears 4.5:1 on each of its own surfaces in all four modes, that every status
  and accent colour clears it too, that filled blocks carry a legible label, and that
  interactive borders clear WCAG 1.4.11's 3:1. A palette change that breaks any of those
  fails CI rather than shipping.
- The six audit-report bars additionally hold a colour-vision floor: no two may come
  closer than 34.5 in a deuteranope or protanope simulation, which is where the
  pre-migration palette failed (it put two oranges side by side). Nothing there may be
  weaker than 4.5:1 on white.
- Test dark mode contrast independently; do not assume light-mode pairs hold.
- Focus states: visible ring (`ring-2 ring-ring ring-offset-2`) on all interactive elements — never remove focus styles.

## 3. Typography

| Role | Face | Token | Notes |
| --- | --- | --- | --- |
| Headings (h1–h4) | **Space Grotesk** | `--font-heading-stack` / `font-heading` | Weights 500/700 loaded; applied globally to h1–h4 |
| Body / UI | **Geist** | `--font-body-stack` / `font-sans` | Default body face |
| Data / numbers | **JetBrains Mono** | `--font-code-stack` / `font-mono` | Stat values, codes, tabular data — always with `tabular-nums` |
| Accessibility override | OpenDyslexic | `--font-dyslexic` | Replaces all stacks when enabled |

Type scale (token-driven; respects `--app-font-scale`):

| Level | Tokens | Size | Component |
| --- | --- | --- | --- |
| Page title | `--page-title-*` | 1.875rem → 2.25rem (md), lh 1.25, tracking −0.025em, w600 | `DashboardHeader` h1 |
| Section title | `--section-title-*` | 1.25rem → 1.375rem (md), lh 1.2, tracking −0.01em, w600 | `SectionHeader`, `CardTitle` |
| Eyebrow | `--eyebrow-*` | 0.75rem, tracking 0.12em, w600, uppercase | Header eyebrows |
| Workspace label | `--workspace-label-*` | 0.75rem, tracking 0.08em, w600, uppercase | Sidebar role badge, nav group labels |
| Body | — | 1rem / lh 1.625 (`leading-relaxed`) | Default |
| Meta / helper | — | 0.875rem / lh 1.5 | Descriptions, table meta |

## 4. Spacing, radii, elevation

- **Spacing:** 4px rhythm via Tailwind's default scale. Cards pad `p-5`/`p-6`; page headers `p-6 md:p-7`; page sections stack with `space-y-6`.
- **Radii** (`tailwind.config.ts` + `--radius-*`): `rounded-field` 6px (inputs, buttons), `rounded-card` 8px (cards, header block), `rounded-pill` 14px. Numeric `--radius-sm…4xl` run 4–16px. Nothing fully rounded except avatars.
- **Shadows** (`tailwind.config.ts` — the only sanctioned shadows; never `shadow-sm/md/lg`):

| Token | Use |
| --- | --- |
| `shadow-card` | Cards and panels (soft blur + 1-step hard edge) |
| `shadow-field` | Selected-state interactive tiles (inset ring) |
| `shadow-header-block` | Inverted page-header block (hard 6px drop + ambient) |
| `shadow-topbar` | Sticky top bar |
| `shadow-solid-primary/neutral/danger` | Solid-block buttons/badges (hard 2px edge + inner highlight) |
| `shadow-press` / `shadow-solid-press` | Pressed (sunken) states |
| `shadow-lift` | Overlays that float (dialogs, drag) |
| `shadow-accent` | Rare accent glow highlight |

- **Motion:** fast and physical. Buttons press in 80ms (`translate-y-[2px]` + inset shadow); fields transition 200ms with `ease-field` (`cubic-bezier(0.2, 0.8, 0.2, 1)`). No decorative animation.

## 5. Header system

Four tiers, from app chrome down to card level. Hierarchy comes from structure and contrast, not from ever-larger type.

| Tier | Component | Treatment |
| --- | --- | --- |
| 1. Nav / top bar | `AppShell` header (`src/components/app/app-shell.tsx`) | Sticky, `border-b-2 border-edge`, `bg-background/90` + blur, `shadow-topbar`. Brand identity (icon + product name + role badge) lives in the sidebar, keeping the top bar quiet. |
| 2. Page header | `DashboardHeader` (`src/components/dashboard/dashboard-header.tsx`) | The signature element: inverted block (`bg-foreground` + `text-background`), `rounded-card`, `shadow-header-block`, page-title tokens, optional uppercase eyebrow, description, action slot, breadcrumbs above. **Manager/admin pages must use this — never a plain `bg-card` shell.** One per screen. |
| 3. Section header | `SectionHeader` (`src/components/dashboard/section-header.tsx`) | Shared header for content groups on the canvas. Section-title tokens (same as `CardTitle`), optional eyebrow/description/actions, real `h2`/`h3` via `as`. Variants: `default`, `ruled` (hard `border-b-2 border-edge/60` rule), `accent` (accent-coloured left tick via the `border-l-tick` width token — at most one per screen). |
| 4. Card header | `CardHeader` + `CardTitle` (`src/components/ui/card.tsx`) | Section-title tokens inside cards; owns the `border-b` separator above tables. |

Usage rules:

- Keep heading levels sequential: `DashboardHeader` renders the page's only `h1`; sections are `h2`; headers inside those sections (including editors) are `h3`.
- Don't hand-roll `flex items-center justify-between` + `<h3>` rows — use `SectionHeader` with the `actions` slot.
- Eyebrows are role/context labels ("Admin workspace"), not decoration; keep them short and uppercase comes from the component.

```tsx
<DashboardHeader
  eyebrow={t("header.eyebrow")}
  title={t("header.title")}
  description={t("header.description")}
  breadcrumbs={[{ label: t("nav.projects"), href: "/admin/projects" }, { label: project.name }]}
  actions={<Button variant="secondary">{t("header.actions.export")}</Button>}
/>

<SectionHeader
  variant="accent"
  title={t("latestAudits.title")}
  description={t("latestAudits.description")}
  actions={<Button variant="outline" size="sm">{t("latestAudits.viewAll")}</Button>}
/>
```

## 6. Core components

- **Buttons** (`src/components/ui/button.tsx`): `default` = solid deep-green block, `secondary` = solid neutral block, `destructive` = solid danger block — all with hard-edge shadows and the 80ms sink on press. `outline` for tertiary actions, `ghost` for toolbars, `link` inline. One primary action per view; icon-only buttons need `aria-label`.
- **Stat cards** (`src/components/dashboard/stat-card.tsx`): 3px tone strip across the top + matching 2px left border, uppercase-tracked label, mono `tabular-nums` value, helper line. Tones: `neutral | primary | success | warning | info | danger | violet` — tone is categorical emphasis, not decoration.
- **Data tables** (`src/components/dashboard/data-table.tsx` + `src/components/ui/table.tsx`): live inside a `Card`; `CardHeader` owns the single `border-b` (the toolbar must not add another); row hover uses `--table-row-hover`; numeric columns use mono + `tabular-nums`; column headers via `DataTableColumnHeader` for sort affordance.
- **Structural dividers:** `border-edge/<opacity>` (e.g. `border-edge/40`), never `border-border`.

## 7. Extending to the Expo mobile app

The token layer was built to travel; `DESIGN_SYSTEM` is plain data (hex strings, rem sizes) with no DOM dependency outside the two helper functions.

1. **Share the data, not the CSS.** Move/copy the `DESIGN_SYSTEM` object (palettes, radii, typography) into a framework-agnostic package (e.g. `playspace/packages/brand-tokens`) consumed by both `copa-frontend` and the Expo app. Keep token names identical so specs read the same on both platforms.
2. **Map roles, not values.** In React Native, build the theme object from the same palette roles (`canvas`, `surface`, `textPrimary`, `edge`, `solidPrimary`…). Light/dark/high-contrast selection mirrors the web logic (`theme` × `contrast`).
3. **Shadows become explicit borders/elevation.** Hard-edge shadows (`0 2px 0 <edge>`) translate well on mobile: render as a 2px bottom border in the `-edge` color (or a second absolutely-positioned block), which is more reliable cross-platform than native shadow APIs. Soft shadows (`shadow-card`) map to `elevation: 2–4` (Android) / small `shadowRadius` (iOS).
4. **Fonts:** load Space Grotesk, Geist, and JetBrains Mono via `expo-font`; reuse the same role mapping (heading/body/mono) and the OpenDyslexic override.
5. **Headers:** the inverted page-header block and section-header tiers port directly — a `View` with `backgroundColor: textPrimary`, `borderRadius: 8`, and the hard edge treatment; native nav bars stay quiet like the web top bar.
6. **Convert rem → dp** at 1rem = 16dp; respect the platform font-scale setting instead of `--app-font-scale`.

## 8. Do / don't

| Do | Don't |
| --- | --- |
| Consume semantic tokens (`bg-card`, `text-muted-foreground`, `border-edge/40`) | Hard-code hex values or use `border-border` |
| Use the sanctioned shadow tokens | Use generic `shadow-sm/md/lg` or invent arbitrary shadows |
| Use the header tiers (`DashboardHeader` → `SectionHeader` → `CardTitle`) | Hand-roll page/section heading markup |
| Keep the page header as the single loud element | Stack multiple inverted/accent blocks on one screen |
| Pair status color with text or icon | Convey state by color alone |
| Put every user-facing string in `messages/en.json` **and** `messages/de.json` | Ship untranslated copy |
| Test light, dark, and high-contrast modes | Assume one theme's contrast holds elsewhere |
