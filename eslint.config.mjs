import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

/**
 * Tailwind palette classes (`bg-amber-100`, `text-zinc-500`, ...) written in any of the
 * three node types a className can be built from. Utility prefixes and shades are spelled
 * out rather than matched loosely so a legitimate identifier like `border-b-2` or a
 * token class like `text-status-warning` cannot trip it.
 */
const TAILWIND_PALETTE = String.raw`\b(bg|text|border|ring|from|via|to|decoration|outline|divide|fill|stroke|shadow|accent|caret|placeholder)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)\b`;
const COLOUR_CLASS_NODES = [
	`Literal[value=/${TAILWIND_PALETTE}/]`,
	`TemplateElement[value.raw=/${TAILWIND_PALETTE}/]`,
	`JSXAttribute[name.name="className"] > JSXExpressionContainer Literal[value=/${TAILWIND_PALETTE}/]`
];

const eslintConfig = defineConfig([
	...nextCoreWebVitals,
	...nextTypescript,
	// Override default ignores of eslint-config-next.
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
		"scripts/**"
	]),
	{
		files: ["**/*.{ts,tsx}"],
		plugins: {
			"simple-import-sort": simpleImportSort
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error"
		}
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"react-hooks/incompatible-library": "off"
		}
	},
	/**
	 * Colour belongs in `brand/tokens.json`, which is shared verbatim with
	 * copa-mobile. A hex literal in a component is a value that the next palette
	 * change will silently leave behind - which is how the two clients drifted
	 * apart before the token pipeline existed.
	 *
	 * Hue-neutral compositing values are allowed: pure black and white at any
	 * alpha (shadows, scrims, overlays) render correctly over any palette, so
	 * tokenising them would be churn without benefit.
	 */
	{
		files: ["src/**/*.{ts,tsx}"],
		ignores: [
			// Generated from brand/tokens.json - the values are the point.
			"src/lib/design-system.generated.ts",
			// Renders when the app itself has failed, so it must not depend on the
			// token pipeline or on any stylesheet having loaded.
			"src/app/global-error.tsx"
		],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"Literal[value=/#(?!fff\\b|ffffff\\b|FFF\\b|FFFFFF\\b|000\\b|000000\\b)[0-9a-fA-F]{3,8}\\b/]",
					message:
						"Hard-coded colour. Add it to brand/tokens.json and read it from @/lib/design-system.generated instead (pnpm tokens:build)."
				},
				{
					selector: "Literal[value=/rgba?\\(\\s*(?!0\\s*,\\s*0\\s*,\\s*0|255\\s*,\\s*255\\s*,\\s*255)\\d/]",
					message:
						"Hard-coded colour. Add it to brand/tokens.json and derive translucent fills with withAlpha() from @/lib/audit/scale-colors."
				},
				// Template literals are a separate AST node. A colour written in
				// backticks - `rgba(30,30,30, 0.4)` in the upload widget - slipped past
				// the Literal selectors above until this was added.
				{
					selector:
						"TemplateElement[value.raw=/#(?!fff\\b|ffffff\\b|FFF\\b|FFFFFF\\b|000\\b|000000\\b)[0-9a-fA-F]{3,8}\\b|rgba?\\(\\s*(?!0\\s*,\\s*0\\s*,\\s*0|255\\s*,\\s*255\\s*,\\s*255)\\d/]",
					message:
						"Hard-coded colour in a template literal. Add it to brand/tokens.json and interpolate the token instead."
				},
				// Tailwind's own palette classes are the other way colour leaks in, and the
				// worse one: `text-amber-600 dark:text-amber-400` looks theme-aware but
				// ignores the contrast mode entirely, so high-contrast users kept getting
				// the same pale amber. The token classes (text-status-warning and friends)
				// resolve per theme *and* per contrast, and need no `dark:` variant.
				{
					selector: `${COLOUR_CLASS_NODES.join(", ")}`,
					message:
						"Raw Tailwind palette class. Use the token class instead - text-status-warning, bg-status-success-surface, border-accent-violet-border and the rest are defined in src/app/globals.css from brand/tokens.json."
				}
			]
		}
	}
]);

export default eslintConfig;
