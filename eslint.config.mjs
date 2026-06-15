import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname
});

const eslintConfig = defineConfig([
	...compat.extends("next/core-web-vitals", "next/typescript"),
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
	}
]);

export default eslintConfig;
