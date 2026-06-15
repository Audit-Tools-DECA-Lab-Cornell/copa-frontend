# COPA Landing — Asset Checklist

Purpose-made device mockups / photography for the landing concept pages. Each
page already ships complete on existing assets; the items below fill the
`HYBRID SLOT` markers and a few quality gaps to make the scenes premium.

**Workflow:** generate the assets below (screenhance / frameuse / photography),
drop them at the exact paths given, then tell me to integrate. I'll wire each
into its slot — no layout changes needed on your side.

---

## Conventions

| Thing | Rule |
| --- | --- |
| **Multi-device composites** | `public/marketing/composites/<name>.png` |
| **Single device renders** | `public/marketing/<name>.png` |
| **Photography** | `public/marketing/photo/<name>.(jpg\|png)` |
| **Framed web screens** | `public/screenshots/Framed/manager/<area>/<state>/<n>.png` (already organized) |
| **Format** | PNG with **transparent background** for device renders/composites; JPG/PNG for photos |
| **Resolution** | ≥ 2× (laptops ~4340×2860, phones ~1857×3096 as a reference) |
| **Shadows** | For pre-baked **composites**, bake a soft floor/contact shadow into the PNG (these render via a plain `<Image>`, not the glow/shadow primitives) |
| **Naming** | kebab-case, descriptive (matches the existing `hero-laptop-phone-dashboard-field.png`) |
| **Theme cohesion** | dark phones grouped with dark phones; light with light |

---

## Already in place — no action needed

- ✅ Framed web screens (semantic paths under `Framed/manager/...`)
- ✅ 8 mobile renders in `public/marketing/` (`hero-dashboard-dark`, `field-questions-dark`, `step-*`, `reports-preview-portrait`, `report-scoring-tilted`)
- ✅ `composites/hero-laptop-phone-dashboard-field.png` — **produced, not yet wired in.** I'll integrate this as the upgraded hero for **Manager Command Center**, **Two Surfaces**, and **Portfolio at Scale**.

---

## Assets to produce

### Composites — `public/marketing/composites/`

- [ ] **`field-trio-dark.png`** — *highest priority; one asset fills 5 slots*
  - **Depicts:** three **dark** phones fanned in an arc — field dashboard + guided question flow + a third dark field screen (section notes or execute).
  - **Source:** `marketing/hero-dashboard-dark.png`, `marketing/field-questions-dark.png`, + a **dark** notes/execute screen (see note ↓).
  - **Canvas:** landscape, transparent, ~2800×1700, baked shadow.
  - **Fills:** Manager Command Center, Anti-Clipboard, Interactive Platform Tour, Two Surfaces, Field-to-Boardroom (Stage 02).
  - **Note:** `step-section-notes.png` / `step-execute-section.png` are currently **light**. For theme cohesion, supply a dark variant of one of them as the third phone, or use `report-scoring-tilted` if it reads dark.

- [ ] **`plan-laptop-roster-phone.png`**
  - **Depicts:** a laptop (projects or places overview) with the **auditor roster** phone floating in front — a two-screen "planning / assign" feel.
  - **Source:** `Framed/manager/projects/01-overview/01.png` (or `places/...`) + a roster phone render.
  - **Canvas:** landscape, transparent, ~3000×2000, baked shadow.
  - **Fills:** Field-to-Boardroom (Stage 01 — *Plan & assign*).

- [ ] **`report-laptop-phone.png`**
  - **Depicts:** the **combined place report** on a laptop with the report phone overlaid front-right — "same evidence, every surface."
  - **Source:** `Framed/manager/reports/place-report/01-overview/01.png` + `marketing/reports-preview-portrait.png`.
  - **Canvas:** landscape, transparent, ~3000×2000, baked shadow.
  - **Fills:** Portfolio at Scale (comparable-outputs section).

- [ ] **`report-phone-fullbleed.png`**
  - **Depicts:** a single, beautifully staged **report phone**, full-bleed, with selective-focus / depth post-processing — gallery-grade.
  - **Source:** `marketing/report-scoring-tilted.png` or `reports-preview-portrait.png`.
  - **Canvas:** portrait, ~1900×2700 (transparent or subtle gradient bg).
  - **Fills:** Editorial Minimal (hero/report moment).

### Single device renders — `public/marketing/`

- [ ] **`field-offline-landscape.png`**
  - **Depicts:** a phone rotated to **landscape**, cropped close on the **offline-ready / sync** indicator.
  - **Source:** the field dashboard screen, landscape orientation, zoomed on the connectivity/offline state.
  - **Canvas:** landscape, transparent, ~2400×1400.
  - **Fills:** Field-to-Boardroom (Stage 03 — *Capture & sync*).

- [ ] **`field-dashboard-offline-badge.png`**
  - **Depicts:** the field dashboard phone with the **offline badge** prominent — a clean campaign shot.
  - **Source:** `marketing/hero-dashboard-dark.png` recomposed with the offline badge emphasized.
  - **Canvas:** portrait, transparent, ~1857×3096.
  - **Fills:** Editorial Minimal (offline / reliability moment).

### Photography — `public/marketing/photo/`

- [ ] **`playground-overhead.png`** (or `.jpg`)
  - **Depicts:** an **overhead or child's-eye** view of a real outdoor playspace — natural features, varied play, inclusive.
  - **Canvas:** landscape, ~2400×1600, high-res, licensed.
  - **Fills:** Children-First (hero / "the child's question").

- [ ] **`outdoor-play.png`** (or `.jpg`)
  - **Depicts:** a warm **outdoor play** photograph to sit **behind a translucent phone** (children playing, diverse abilities, natural setting).
  - **Canvas:** landscape, ~2400×1600, high-res, licensed.
  - **Fills:** Children-First (closing / mission-into-evidence moment).

---

## Per-page slot map (current `master`)

| Page | Slot (file:line) | Asset |
| --- | --- | --- |
| Manager Command Center | `manager-command-center.tsx:377` | `composites/field-trio-dark.png` |
| Manager Command Center | *hero (upgrade)* | `composites/hero-laptop-phone-dashboard-field.png` ✅ produced |
| Field-to-Boardroom Loop | `field-to-boardroom-loop.tsx:258` | `composites/plan-laptop-roster-phone.png` |
| Field-to-Boardroom Loop | `field-to-boardroom-loop.tsx:308` | `composites/field-trio-dark.png` |
| Field-to-Boardroom Loop | `field-to-boardroom-loop.tsx:429` | `field-offline-landscape.png` |
| Anti-Clipboard | `anti-clipboard.tsx:380` | `composites/field-trio-dark.png` |
| Interactive Platform Tour | `interactive-platform-tour.tsx:388` | `composites/field-trio-dark.png` |
| Two Surfaces, One Account | `two-surfaces-one-account.tsx:358` | `composites/field-trio-dark.png` |
| Two Surfaces, One Account | *hero (upgrade)* | `composites/hero-laptop-phone-dashboard-field.png` ✅ produced |
| Portfolio at Scale | `portfolio-at-scale.tsx:364` | `composites/report-laptop-phone.png` |
| Portfolio at Scale | *hero (upgrade)* | `composites/hero-laptop-phone-dashboard-field.png` ✅ produced |
| Editorial Minimal | `editorial-minimal.tsx:116` | `composites/report-phone-fullbleed.png` |
| Editorial Minimal | `editorial-minimal.tsx:194` | `field-dashboard-offline-badge.png` |
| Children-First | `children-first.tsx:111` | `photo/playground-overhead.png` |
| Children-First | `children-first.tsx:382` | `photo/outdoor-play.png` |

> Line numbers are a hint and will drift as slots are filled. The page + section
> names are the stable reference.

---

## Optional — future polish (not blocking)

These unlock new section treatments but aren't required to fill any current slot:

- [ ] **`marketing/ipad-execute-landscape.png`** — iPad in landscape running the execute/audit view (field auditors on tablets). Great for Platform Tour & Two Surfaces.
- [ ] **Dark framed laptop** — every framed laptop is the light theme, so dark inverted bands can only show phones. A dark-theme laptop export would let dark bands show the web app too.
- [ ] **Right-tilt phone renders** — we only have left-tilt/straight; a mirrored right-tilt makes symmetric multi-phone arcs cleaner.
- [ ] **`Framed/manager/dashboard/01-overview/01.png` is available** — the true "workspace dashboard" overview is framed but not yet used on any page; consider featuring it.

---

### Summary: 8 new assets to produce

`field-trio-dark` · `plan-laptop-roster-phone` · `report-laptop-phone` ·
`report-phone-fullbleed` · `field-offline-landscape` ·
`field-dashboard-offline-badge` · `photo/playground-overhead` · `photo/outdoor-play`

Plus `hero-laptop-phone-dashboard-field.png` (✅ already produced) to wire in.
When they're in place, tell me and I'll integrate each into its slot.
