/**
 * Canonical PV scale colour palette — fixed product tokens, independent of
 * theme accent colours (slate, moss, terracotta, violet).
 *
 * Used by dashboard badges, landing page, report views, PDF, and Excel exports.
 */

export const PV_SCALE_KEYS = ["provision", "diversity", "challenge", "sociability"] as const;

export type PvScaleKey = (typeof PV_SCALE_KEYS)[number];

/** Canonical accent hex colours for each PV scale. */
export const SCALE_ACCENT_COLORS: Record<PvScaleKey, string> = {
	provision: "#566E3D",
	diversity: "#BD4926",
	challenge: "#0C4767",
	sociability: "#754170"
};

/**
 * Soft fills are blended from each accent toward white so column backgrounds
 * and badge fills stay clearly lighter than accent text and borders.
 */
const SCALE_SOFT_BLEND_WEIGHT = 0.2;

function parseHexColor(hex: string): [number, number, number] {
	const normalized = hex.replace("#", "").trim();
	if (normalized.length !== 6) {
		throw new Error(`Expected 6-digit hex color, received "${hex}"`);
	}

	const red = Number.parseInt(normalized.slice(0, 2), 16);
	const green = Number.parseInt(normalized.slice(2, 4), 16);
	const blue = Number.parseInt(normalized.slice(4, 6), 16);

	if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) {
		throw new Error(`Invalid hex color "${hex}"`);
	}

	return [red, green, blue];
}

function toHexByte(value: number): string {
	return Math.round(value).toString(16).padStart(2, "0");
}

function blendHexWithWhite(hex: string, accentWeight: number): string {
	const [red, green, blue] = parseHexColor(hex);
	const backgroundWeight = 1 - accentWeight;

	const blendedRed = 255 * backgroundWeight + red * accentWeight;
	const blendedGreen = 255 * backgroundWeight + green * accentWeight;
	const blendedBlue = 255 * backgroundWeight + blue * accentWeight;

	return `#${toHexByte(blendedRed)}${toHexByte(blendedGreen)}${toHexByte(blendedBlue)}`;
}

/** Canonical soft background hex colours for scale columns and badge fills. */
export const SCALE_SOFT_COLORS: Record<PvScaleKey, string> = {
	provision: blendHexWithWhite(SCALE_ACCENT_COLORS.provision, SCALE_SOFT_BLEND_WEIGHT),
	diversity: blendHexWithWhite(SCALE_ACCENT_COLORS.diversity, SCALE_SOFT_BLEND_WEIGHT),
	challenge: blendHexWithWhite(SCALE_ACCENT_COLORS.challenge, SCALE_SOFT_BLEND_WEIGHT),
	sociability: blendHexWithWhite(SCALE_ACCENT_COLORS.sociability, SCALE_SOFT_BLEND_WEIGHT)
};

/** Fixed accent and soft-fill hex values per PV scale. */
export const PV_SCALE_PALETTE: Record<PvScaleKey, { readonly accent: string; readonly soft: string }> = {
	provision: { accent: SCALE_ACCENT_COLORS.provision, soft: SCALE_SOFT_COLORS.provision },
	diversity: { accent: SCALE_ACCENT_COLORS.diversity, soft: SCALE_SOFT_COLORS.diversity },
	challenge: { accent: SCALE_ACCENT_COLORS.challenge, soft: SCALE_SOFT_COLORS.challenge },
	sociability: { accent: SCALE_ACCENT_COLORS.sociability, soft: SCALE_SOFT_COLORS.sociability }
};

/** CSS custom property names for each scale accent and soft fill. */
export const SCALE_CSS_VAR_NAMES: Record<PvScaleKey, { readonly accent: string; readonly soft: string }> = {
	provision: { accent: "--scale-provision", soft: "--scale-provision-soft" },
	diversity: { accent: "--scale-diversity", soft: "--scale-diversity-soft" },
	challenge: { accent: "--scale-challenge", soft: "--scale-challenge-soft" },
	sociability: { accent: "--scale-sociability", soft: "--scale-sociability-soft" }
};

/** Tailwind classes for scale badges (border / soft fill / text). */
export const SCALE_BADGE_CLASS_NAMES: Record<PvScaleKey, string> = {
	provision: "border-scale-provision/40 bg-scale-provision-soft text-scale-provision",
	diversity: "border-scale-diversity/40 bg-scale-diversity-soft text-scale-diversity",
	challenge: "border-scale-challenge/40 bg-scale-challenge-soft text-scale-challenge",
	sociability: "border-scale-sociability/40 bg-scale-sociability-soft text-scale-sociability"
};

/** Top accent bar class for cards and report stat headers. */
export const SCALE_ACCENT_BAR_CLASS_NAMES: Record<PvScaleKey, string> = {
	provision: "bg-scale-provision",
	diversity: "bg-scale-diversity",
	challenge: "bg-scale-challenge",
	sociability: "bg-scale-sociability"
};

/** Text colour class for scale labels. */
export const SCALE_ACCENT_TEXT_CLASS_NAMES: Record<PvScaleKey, string> = {
	provision: "text-scale-provision",
	diversity: "text-scale-diversity",
	challenge: "text-scale-challenge",
	sociability: "text-scale-sociability"
};

/** CSS variable reference for inline styles (e.g. progress bar fills). */
export function getScaleAccentCssVar(scaleKey: PvScaleKey): string {
	return `var(${SCALE_CSS_VAR_NAMES[scaleKey].accent})`;
}

/** Injects fixed PV scale colours as CSS custom properties on `:root`. */
export function getPvScaleCssVariables(): Record<string, string> {
	const variables: Record<string, string> = {};

	for (const scaleKey of PV_SCALE_KEYS) {
		const names = SCALE_CSS_VAR_NAMES[scaleKey];
		const palette = PV_SCALE_PALETTE[scaleKey];
		variables[names.accent] = palette.accent;
		variables[names.soft] = palette.soft;
	}

	return variables;
}

/** Converts `#RRGGBB` to an RGB tuple for PDF/jsPDF consumers. */
export function hexToRgb(hex: string): [number, number, number] {
	return parseHexColor(hex);
}

/** Strips `#` for XLSX `rgb` style fields. */
export function hexToXlsxRgb(hex: string): string {
	return hex.replace("#", "").trim().toUpperCase();
}
