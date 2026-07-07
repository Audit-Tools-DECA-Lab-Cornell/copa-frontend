# COPA Brand Kit

Source of truth for COPA / Playspace visual identity across the web dashboard (this repo) and, later, the Expo mobile app. Every value in this document is backed by a token in `src/lib/design-system.ts` or `tailwind.config.ts` — components must consume tokens, never raw values.

## 1. Brand identity: Warm Brutalism

COPA audits real playgrounds and turns fieldwork into evidence. The visual language reflects that: **warm, paper-like surfaces** (clipboards, kraft paper, outdoor materials) carrying **solid, unambiguous ink blocks** (stamps, printed labels, hard edges). We call this direction **Warm Brutalism**.

What it means in practice:

- **Warm neutrals, not gray.** Canvas and surfaces are warm creams (light) and deep espresso browns (dark) — never blue-gray or pure white/black outside high-contrast mode.
- **Solid blocks, hard edges.** Primary actions, badges, and page headers are solid fills with a hard offset "edge" shadow (`0 2px 0 <edge-color>`), so they read as physical blocks embedded in the surface. Pressing a button visibly sinks it.
- **Inverted page headers.** The page header is the one deliberately loud element per screen: an ink-colored block (`bg-foreground` + `text-background`) with a hard drop edge. Everything else stays quiet.
- **One accent carries the system.** Terracotta is the primary accent; moss, slate, and violet are supporting accents used sparingly (status, charts, categorical color).
- **No wordmark-only lockups.** Brand presence is the icon (`/icon.png`) plus the product name set in the heading face — never a standalone decorative wordmark.
- **Minimal, professional, accessible.** WCAG-aware contrast in both themes, a dedicated high-contrast mode, dyslexic-font support, and font scaling (0.85–1.3×) are part of the brand, not add-ons.

## 2. Color tokens

All colors live in `DESIGN_SYSTEM.palettes` (`src/lib/design-system.ts`) in four modes: `light`/`dark` × `standard`/`high` contrast. They are emitted as CSS custom properties and mapped to Tailwind utilities in `src/app/globals.css`. **Never hard-code hex values in components.**

### Surfaces & text (semantic roles)

| Role | Token / utility | Light (standard) | Dark (standard) |
| --- | --- | --- | --- |
| App canvas | `bg-background` (`--canvas`) | `#f5ede3` | `#18140f` |
| Card surface | `bg-card` (`--surface`) | `#fdf6ee` | `#211c17` |
| Raised surface (popovers) | `bg-surface-raised` | `#fffcf8` | `#29231d` |
| Sunken surface (wells, inputs) | `bg-surface-sunken` | `#e9ddd1` | `#130f0b` |
| Primary text | `text-foreground` (`--text-primary`) | `#2f2722` | `#ebe3d7` |
| Secondary text | `text-text-secondary` | `#5a4f45` | `#d2c7b8` |
| Muted text | `text-muted-foreground` | `#7a6f64` | `#a89c8f` |
| Structural edge | `border-edge` (use `/40`–`/60` opacity) | `#d1c5bb` | `#4a433e` |
| Focus ring | `ring-ring` (`--focus`) | `#b77446` | `#d0a177` |

### Accents

| Accent | Token | Value (both themes, standard) | Use |
| --- | --- | --- | --- |
| Terracotta (primary) | `--accent-terracotta` / `bg-primary` | `#c58a5c` | Primary accent, focus, selection, section-header accent tick |
| Moss | `--accent-moss` | `#6f9a7f` | Success-adjacent, categorical |
| Slate | `--accent-slate` | `#7b90b8` | Info, categorical |
| Violet | `--accent-violet` | `#9b86b2` | Categorical, stat tones |

### Status colors

`--status-success/warning/danger/pending/in-progress`, each with paired `-surface` and `-border` tokens for soft badges. Status meaning must never be conveyed by color alone — pair with a label or icon.

### Solid blocks (Warm Brutalism controls)

`--solid-primary/neutral/danger/draft/orphan` with matching `-edge` (hard shadow color) and `-text` tokens. These drive the default/secondary/destructive button variants, `bru-*` classes, badges, and active nav items. The deep-green `solid-primary` (`#2d5c3e`) is the action color; terracotta stays an accent, not a button fill.

### Accessibility rules

- Body text on its surface must meet **WCAG AA 4.5:1**; large headings 3:1. The high-contrast palettes exist for users who need more — never "fix" a standard-palette contrast problem by telling users to switch modes.
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
| `shadow-accent` | Rare terracotta glow highlight |

- **Motion:** fast and physical. Buttons press in 80ms (`translate-y-[2px]` + inset shadow); fields transition 200ms with `ease-field` (`cubic-bezier(0.2, 0.8, 0.2, 1)`). No decorative animation.

## 5. Header system

Four tiers, from app chrome down to card level. Hierarchy comes from structure and contrast, not from ever-larger type.

| Tier | Component | Treatment |
| --- | --- | --- |
| 1. Nav / top bar | `AppShell` header (`src/components/app/app-shell.tsx`) | Sticky, `border-b-2 border-edge`, `bg-background/90` + blur, `shadow-topbar`. Brand identity (icon + product name + role badge) lives in the sidebar, keeping the top bar quiet. |
| 2. Page header | `DashboardHeader` (`src/components/dashboard/dashboard-header.tsx`) | The signature element: inverted block (`bg-foreground` + `text-background`), `rounded-card`, `shadow-header-block`, page-title tokens, optional uppercase eyebrow, description, action slot, breadcrumbs above. **Manager/admin pages must use this — never a plain `bg-card` shell.** One per screen. |
| 3. Section header | `SectionHeader` (`src/components/dashboard/section-header.tsx`) | Shared header for content groups on the canvas. Section-title tokens (same as `CardTitle`), optional eyebrow/description/actions, real `h2`/`h3` via `as`. Variants: `default`, `ruled` (hard `border-b-2 border-edge/60` rule), `accent` (terracotta left tick via the `border-l-tick` width token — at most one per screen). |
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
