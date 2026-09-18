import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

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
			"src/app/global-error.tsx",
			// A JSON syntax highlighter. Its palette is an editor theme (string,
			// number, key, punctuation), deliberately independent of brand colour.
			"src/components/dashboard/raw-json.tsx"
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
				}
			]
		}
	}
]);

export default eslintConfig;
