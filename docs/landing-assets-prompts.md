# COPA Landing - AI Generation Prompts + Source Screenshots

Companion to `landing-assets-checklist.md`. For each asset to produce, this gives
you (a) the **exact source screenshots** to feed your AI tool - chosen only from
`assets/mobile/framed` and `assets/web/framed` (independent framed renders, easiest
for an AI tool to recompose) - and (b) a ready-to-paste **prompt**.

All phone sources are the **dark** iPhone-15 mockup set (theme cohesion: dark with
dark). All laptop sources are the light/cream MacBook framed set (the only laptop
theme we have). Paths are relative to the workspace root.

**Tilt note:** framed phones exist as `-portrait` (straight), `-left` (left tilt),
and `-landscape`. We have **no right-tilt** export - for symmetric arcs, tell the
tool to horizontally mirror a `-left` phone.

**Universal constraints to append to every device prompt:**
> Transparent background (alpha PNG). Keep each screen's pixels crisp and undistorted -
> do not regenerate, relabel, or hallucinate UI; treat each screenshot as a fixed
> texture mapped onto the device. Bake one soft, realistic contact/floor shadow under
> the group. Output ≥2× resolution. No extra text, no logos, no UI redraw, no warped glass.

---

## 1. `composites/field-trio-dark.png`  ⭐ highest priority - fills 5 slots

**Sources (dark iPhone-15 framed):**
| Role in arc | File |
| --- | --- |
| Left phone (left tilt) | `assets/mobile/framed/apple-iphone-15-dark-mockup/03-home-left.png` |
| Center phone (straight, raised) | `assets/mobile/framed/apple-iphone-15-dark-mockup/11-execute-section-questions-portrait.png` |
| Right phone (mirror to right tilt) | `assets/mobile/framed/apple-iphone-15-dark-mockup/12-execute-section-notes-portrait.png` |

`12-execute-section-notes` is genuinely dark here - it resolves the "third phone is
light" cohesion worry in the checklist; no light substitute needed. Swap candidate
for the right phone if you want color punch: `16-report-detail-early-portrait.png`
(scoring bars).

**Prompt:**
> Compose three iPhones fanned in a gentle arc on a transparent canvas, landscape
> ~2800×1700. Left phone tilted slightly left, center phone upright and lifted a touch
> higher and forward, right phone mirrored to a slight right tilt. Even premium product
> lighting, subtle depth (center sharpest, outer phones a hair softer). Phones overlap
> ~15%. One cohesive soft contact shadow beneath all three. Dark devices on transparent
> bg. [+ universal constraints]

---

## 2. `composites/plan-laptop-roster-phone.png`

**Sources:**
| Role | File |
| --- | --- |
| Laptop (planning / assign) | `assets/web/framed/manager/projects/01-overview/01.png` |
| Phone, floating front-right | `assets/mobile/framed/apple-iphone-15-dark-mockup/04-home-queue-portrait.png` |

Note: the auditor app has no dedicated "auditor roster" screen, so the **assigned-audit
queue** (`04-home-queue`) is the truest "plan & assign" phone. If you'd rather the
floating screen be web, swap the phone for the framed `manager/auditors/01-overview/01.png`
laptop and make it a two-laptop scene - but the phone reads better for the loop.

**Prompt:**
> A MacBook (project portfolio overview on screen) sits centered-left; a single dark
> iPhone (assigned-audit queue) floats in front and to the right, slightly overlapping
> the laptop's lower-right corner, tilted ~8°. Landscape ~3000×2000, transparent bg.
> "Planning on the desk, assignment in the hand" feeling. Cohesive soft shadow grounding
> both. [+ universal constraints]

---

## 3. `composites/report-laptop-phone.png`

**Sources:**
| Role | File |
| --- | --- |
| Laptop (combined place report) | `assets/web/framed/manager/reports/place-report/01-overview/01.png` |
| Phone, overlaid front-right | `assets/mobile/framed/apple-iphone-15-dark-mockup/16-report-detail-early-portrait.png` |

`16-report-detail-early` shows the colorful Provision/Variety/Play-Value/Usability
scoring bars - best "same evidence, every surface" pairing against the laptop's
combined report. Cleaner alternative phone: `15-report-detail-top-portrait.png`
(score summary card, PV/U totals).

**Prompt:**
> A MacBook showing a combined place report sits centered; a dark iPhone showing the
> same report's scoring breakdown floats front-right, overlapping the laptop bezel,
> tilted ~8°. Emphasize that both screens show the same audit evidence. Landscape
> ~3000×2000, transparent bg, one cohesive soft shadow. [+ universal constraints]

---

## 4. `composites/report-phone-fullbleed.png`

**Source (pick one):**
- `assets/mobile/framed/apple-iphone-15-dark-mockup/16-report-detail-early-portrait.png` - colorful scoring bars (recommended, most gallery-grade)
- `assets/mobile/framed/apple-iphone-15-dark-mockup/15-report-detail-top-portrait.png` - score summary, calmer

**Prompt:**
> A single dark iPhone showing a play-value audit report, staged gallery-style, full
> bleed, portrait ~1900×2700. Cinematic selective focus: tack-sharp on the upper screen,
> gentle depth-of-field falloff toward the edges. Soft directional key light, premium
> editorial mood. Optional very subtle dark-to-charcoal gradient backdrop (or keep
> transparent). One soft grounding shadow. [+ universal constraints]

---

## 5. `marketing/field-offline-landscape.png`

**Source:**
- `assets/mobile/framed/apple-iphone-15-dark-mockup/03-home-landscape.png`

This landscape frame already surfaces the **"Offline ready / Connectivity status"**
block on the left edge - exactly the indicator to crop on.

**Prompt:**
> A dark iPhone rotated to landscape, transparent bg, ~2400×1400. Crop in close on the
> left portion of the screen where the connectivity / "Offline ready" status block sits;
> let the rest of the dashboard fall slightly out of frame. Shallow depth of field
> keeping the offline indicator crisp. Soft contact shadow. [+ universal constraints]

---

## 6. `marketing/field-dashboard-offline-badge.png`

**Source:**
- `assets/mobile/framed/apple-iphone-15-dark-mockup/03-home-portrait.png`

The portrait Field Dashboard ends with the "Offline ready - assigned audit data is
stored locally" badge. Recompose with that badge emphasized.

**Prompt:**
> A single dark iPhone, portrait ~1857×3096, transparent bg, showing the field dashboard.
> Clean campaign composition, phone upright and centered. Subtly draw the eye to the
> "Offline ready" connectivity badge near the bottom - a touch more contrast / a soft
> glow ring around that card - without altering its text. Soft grounding shadow.
> [+ universal constraints]

---

## 7 & 8. Photography - `photo/playground-overhead.*` and `photo/outdoor-play.*`

⚠️ **No screenshot source applies.** These are real-world photographs; nothing in
`assets/mobile` or `assets/web` can supply them. Use a photoreal generator (or licensed
stock) - prompts below. Keep them warm and authentic; avoid an obviously synthetic look.

**`playground-overhead`** (Children-First hero):
> High-resolution overhead / drone-style photograph of a real outdoor playground, warm
> late-afternoon light. Natural and varied play features - climbing structures, sand,
> greenery, accessible ramps - children of diverse ages and abilities playing. Inclusive,
> documentary, un-staged. Landscape ~2400×1600. Photoreal, no text, no logos.

**`outdoor-play`** (Children-First closing, sits behind a translucent phone):
> Warm candid photograph of children playing outdoors in a natural setting, diverse
> abilities, soft golden-hour light, shallow depth of field, gentle bokeh. Composed with
> calm negative space on one side so a translucent phone can overlay it. Landscape
> ~2400×1600. Photoreal, hopeful, no text, no logos.

---

## Quick pick list (copy/paste)

```
field-trio-dark        ← iphone-dark: 03-home-left + 11-execute-section-questions-portrait + 12-execute-section-notes-portrait (mirror)
plan-laptop-roster     ← web manager projects/01-overview/01  +  iphone-dark 04-home-queue-portrait
report-laptop-phone    ← web manager reports/place-report/01-overview/01  +  iphone-dark 16-report-detail-early-portrait
report-phone-fullbleed ← iphone-dark 16-report-detail-early-portrait (or 15-report-detail-top-portrait)
field-offline-landscape← iphone-dark 03-home-landscape
field-offline-badge    ← iphone-dark 03-home-portrait
playground-overhead    ← (photo / generate - no screenshot source)
outdoor-play           ← (photo / generate - no screenshot source)
```
