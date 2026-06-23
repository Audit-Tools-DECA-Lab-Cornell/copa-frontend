# Visual screenshot catalog

Captures every page of the web dashboard **and** its interactive surfaces -
dialogs, sidebars, dropdown menus, and the same things closed again - into a
nested folder tree that mirrors where each feature lives in the app.

## How it runs

```bash
pnpm screenshots:web      # capture PNGs locally into public/screenshots/**
pnpm test:visual          # same specs, Percy snapshots (needs PERCY_TOKEN)
pnpm test:visual:list     # list every capture without running a browser
```

`screenshots:web` first clears the structured area folders (so stale frames
never linger), sets `CAPTURE_LOCAL_SCREENSHOTS=1`, boots a local dev server (or
reuses one), and seeds an admin / manager / auditor session per page. Captures
that need missing seed data (an audit that was never created, a feature gated
off) are **skipped**, never failed.

## Screen size and scrolling

Everything is captured at a **MacBook Pro 16"** screen (1728 × 1117 - the default
scaled resolution), showing exactly what fits on that screen, not stretched
full-page images.

A state is therefore one of two shapes:

- **Fits on screen → a single file** `NN-<state>.png`.
- **Taller than the screen → a folder** `NN-<state>/` holding sequential scroll
  frames `01.png`, `02.png`, … each a screenful while scrolling to the bottom.
  The sticky header pins to every frame; the sidebar scrolls away with the page.

Open modals/menus lock page scroll, so they are always a single file. Scroll is
measured on the window (the dashboard scrolls the document, not an inner pane).

## Output structure

One folder per page; the path mirrors the route. Detail pages and builders nest
under their parent. States are ordered `NN-<state>` within each folder.

```
public/screenshots/
  auth/login/01-overview.png                  # fits on screen → single file
  admin/dashboard/01-overview/                 # taller than screen → folder of frames
    01.png
    02.png
  admin/dashboard/02-sidebar-collapsed.png
  admin/dashboard/03-mobile-nav-open.png       # modal → single file
  admin/dashboard/04-account-menu-open.png
  admin/reports/01-overview/                    # long reports list → 5 scroll frames
    01.png … 05.png
  admin/reports/02-combined-builder-pair-selected.png   # the build-a-place-report modal
  manager/projects/01-overview/                 # 01.png, 02.png
  manager/projects/02-create-dialog-open.png    # modal → single file
  manager/projects/detail/01-overview.png       # fits → single file
  manager/reports/place-report/01-overview/     # the built combined report (audit + survey)
    01.png … 06.png
  auditor/execute/01-overview/                  # 01.png … 03.png
  ...
  manifest.json   # generated index of every frame ({ area, state, file, label, scrolled })
```

The combined place report is special: a place report merges a submitted place
audit with a submitted place survey. The seed resolver finds a place that has
both, opens the builder for it (so the modal shows the audit + survey pair
selected), and the `place-report` view is captured by loading that built report
with real `?audit=&survey=&placeId=` source ids - not the bare route, which
shows an error because it has no sources to load.

The pre-existing flat `*__*.png` files in `public/screenshots/` are the README's
documentation assets and are left untouched.

## How it's wired

```
tests/visual/
  catalog.spec.ts        # driver: turns the catalog into one test per state
  catalog/
    types.ts             # CaptureTarget / CaptureState contracts
    steps.ts             # resilient interactions (openDialog, collapseSidebar, …)
    shared.ts            # app-chrome states attached to each dashboard
    auth.ts              # public/unauthenticated pages
    admin.ts             # /admin/** pages, one entry per page
    manager.ts           # /manager/** pages
    auditor.ts           # /auditor/** pages
    index.ts             # aggregates every area into captureCatalog
```

Each `CaptureTarget` is a page. Its `segments` are the output folder. Its
`states` are the screenshots: the first is the page at rest; the rest are
interactions reached from a freshly prepared page (so order never matters).

## Adding a screenshot

To capture a new modal on the manager projects page, add a state to that target
in `catalog/manager.ts`:

```ts
{
  name: "archive-dialog-open",
  label: "Manager Projects - Archive dialog",
  optional: true, // skip (don't fail) if the trigger isn't present
  setup: ({ page }) => openDialog(page, /archive/i)
}
```

To capture a new page, add a `CaptureTarget` with its `segments` folder path.
Reach for the helpers in `steps.ts`; they throw `StateUnavailableError` when
their target is missing, which `optional` states turn into a clean skip.
