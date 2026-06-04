## Session Learnings

Read `CALIBER_LEARNINGS.md` for patterns and anti-patterns learned from previous sessions.
These are auto-extracted from real tool usage — treat them as project-specific rules.

- **[correction:personal]** When shortening or cleaning up comments, the goal is **compact AND helpful for a first-time reader** — not just shorter. Remove a comment only when the code is completely self-evident. Keep it when it explains a non-obvious constraint, subtle invariant, or "why" a developer wouldn't guess from the name alone. The target bar: a new developer reading the function for the first time should finish understanding from the comment, not from reverse-engineering the implementation.

- **[gotcha:project]** `border-border` is NOT the correct design token for this project. Always use `border-edge/<opacity>` (e.g. `border-edge/40`, `border-edge/50`, `border-edge/60`) for structural dividers. `border-border` exists but produces visually inconsistent results in the design system. Check `tailwind.config.ts` — `edge` is the semantic separator token.

- **[pattern:project]** When doing a codebase-wide Tailwind token migration with `sed -i ''` on macOS, sweep from most-specific patterns first (e.g. `border-border/70`, `border-border/60`) down to bare `\bborder-border\b` to avoid double-replacement. Use `grep -rn --include="*.tsx"` for verification passes between sweeps.

- **[fix:project]** For `sed` replacements across multiple known files on macOS, pass all file paths as separate arguments to a single `sed` call: `sed -i '' 's/.../.../' file1 file2 file3`. A `for` loop with `$f` inside a here-string or tool description field silently fails because the variable isn't expanded — the literal `$f` becomes the filename.

- **[gotcha:project]** Paths containing Next.js route groups (parentheses like `(protected)`) need quoting in shell commands: wrap the full path in double quotes, or escape the parens as `\(protected\)` when using `find`/`grep` without `-E`.

- **[gotcha:project]** The `DataTableToolbar` component (`src/components/dashboard/data-table-toolbar.tsx`) renders inside a `Card` immediately after `CardHeader` in `data-table.tsx`. If both carry a `border-b`, two horizontal lines appear in the table header area. The toolbar div should NOT have its own `border-b` — only the `CardHeader` (in `data-table.tsx`) owns that separator.

- **[pattern:project]** Design-system shadow tokens: use `shadow-card` for cards/panels, `shadow-field` for selected-state interactive tiles, and explicit `shadow-[0_3px_0_rgba(0,0,0,0.12),0_6px_16px_rgba(0,0,0,0.08)]` for floating/dropdown surfaces. Avoid generic `shadow-sm`, `shadow-md`, `shadow-lg` — they don't align with the project's visual language.
