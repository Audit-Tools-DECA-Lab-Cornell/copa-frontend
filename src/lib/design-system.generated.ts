/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source:      brand/tokens.json (checksum 766198809a6ad314)
 * Regenerate:  pnpm tokens:build
 * Verify:      pnpm tokens:check
 *
 * Colour is defined once, in brand/tokens.json, and shared with copa-mobile.
 * Editing this file by hand will be reverted by the next generator run and
 * will fail the `tokens:check` job in CI.
 */

/**
 * Default appearance for this platform, resolved from brand/tokens.json. The palette
 * a first-time visitor sees is part of the brand, so it lives with the colours rather
 * than as a literal in design-system.ts.
 */
export const GENERATED_DEFAULTS: {
	readonly theme: "light" | "dark";
	readonly contrast: "standard" | "high";
} = {
	theme: "light",
	contrast: "standard"
};

export const GENERATED_PALETTES = {
	light: {
		standard: {
			canvas: "#F7F9FB",
			surface: "#FFFFFF",
			surfaceRaised: "#FFFFFF",
			surfaceSunken: "#EDF1F5",
			textPrimary: "#14181D",
			textSecondary: "#3A424B",
			textMuted: "#5C6773",
			edge: "#D6DCE2",
			focus: "#01497C",
			accentTerracotta: "#01497C",
			accentMoss: "#0F6B45",
			accentSlate: "#297596",
			accentViolet: "#5B4C8A",
			statusSuccess: "#0F6B45",
			statusWarning: "#8A5A00",
			statusDanger: "#B3261E",
			statusPending: "#5C6773",
			statusInProgress: "#01497C",
			statusSuccessSurface: "rgba(15, 107, 69, 0.14)",
			statusSuccessBorder: "rgba(15, 107, 69, 0.28)",
			statusWarningSurface: "rgba(138, 90, 0, 0.14)",
			statusWarningBorder: "rgba(138, 90, 0, 0.28)",
			statusDangerSurface: "rgba(179, 38, 30, 0.14)",
			statusDangerBorder: "rgba(179, 38, 30, 0.28)",
			statusPendingSurface: "rgba(92, 103, 115, 0.12000000000000001)",
			statusPendingBorder: "rgba(92, 103, 115, 0.24000000000000002)",
			statusInProgressSurface: "rgba(1, 73, 124, 0.12000000000000001)",
			statusInProgressBorder: "rgba(1, 73, 124, 0.24000000000000002)",
			statusInfoSurface: "rgba(41, 117, 150, 0.14)",
			statusInfoBorder: "rgba(41, 117, 150, 0.28)",
			accentVioletSurface: "rgba(91, 76, 138, 0.14)",
			accentVioletBorder: "rgba(91, 76, 138, 0.28)",
			primaryForeground: "#FFFFFF",
			inputBorder: "#7E8A96",
			actionOutlineBorder: "rgba(20, 24, 29, 0.22)",
			tableRowHover: "rgba(20, 24, 29, 0.04)",
			statAccentNeutral: "rgba(20, 24, 29, 0.12)",
			solidPrimary: "#01497C",
			solidPrimaryEdge: "#012A4A",
			solidPrimaryText: "#EFF6FB",
			solidNeutral: "#3A424B",
			solidNeutralEdge: "#14181D",
			solidNeutralText: "#E8EDF2",
			solidDanger: "#8C1D18",
			solidDangerEdge: "#5C1310",
			solidDangerText: "#FDECEA",
			solidDraft: "#3E4A55",
			solidDraftText: "#E8EDF2",
			solidOrphan: "#7A4E00",
			solidOrphanText: "#FFF1D6"
		},
		high: {
			canvas: "#FFFFFF",
			surface: "#FFFFFF",
			surfaceRaised: "#FFFFFF",
			surfaceSunken: "#F2F5F8",
			textPrimary: "#000000",
			textSecondary: "#1A1F26",
			textMuted: "#37414D",
			edge: "#3D4750",
			focus: "#00335C",
			accentTerracotta: "#00335C",
			accentMoss: "#0A4A31",
			accentSlate: "#00456E",
			accentViolet: "#3F3168",
			statusSuccess: "#0A4A31",
			statusWarning: "#5C3D00",
			statusDanger: "#8C1D18",
			statusPending: "#37414D",
			statusInProgress: "#00335C",
			statusSuccessSurface: "rgba(10, 74, 49, 0.16)",
			statusSuccessBorder: "rgba(10, 74, 49, 0.32)",
			statusWarningSurface: "rgba(92, 61, 0, 0.16)",
			statusWarningBorder: "rgba(92, 61, 0, 0.32)",
			statusDangerSurface: "rgba(140, 29, 24, 0.16)",
			statusDangerBorder: "rgba(140, 29, 24, 0.32)",
			statusPendingSurface: "rgba(55, 65, 77, 0.14)",
			statusPendingBorder: "rgba(55, 65, 77, 0.28)",
			statusInProgressSurface: "rgba(0, 51, 92, 0.14)",
			statusInProgressBorder: "rgba(0, 51, 92, 0.28)",
			statusInfoSurface: "rgba(0, 69, 110, 0.16)",
			statusInfoBorder: "rgba(0, 69, 110, 0.32)",
			accentVioletSurface: "rgba(63, 49, 104, 0.16)",
			accentVioletBorder: "rgba(63, 49, 104, 0.32)",
			primaryForeground: "#FFFFFF",
			inputBorder: "#5A6570",
			actionOutlineBorder: "rgba(0, 0, 0, 0.36)",
			tableRowHover: "rgba(0, 0, 0, 0.08)",
			statAccentNeutral: "rgba(0, 0, 0, 0.2)",
			solidPrimary: "#00335C",
			solidPrimaryEdge: "#001C33",
			solidPrimaryText: "#FFFFFF",
			solidNeutral: "#1A1F26",
			solidNeutralEdge: "#000000",
			solidNeutralText: "#FFFFFF",
			solidDanger: "#6E1512",
			solidDangerEdge: "#420C0A",
			solidDangerText: "#FFFFFF",
			solidDraft: "#2C353E",
			solidDraftText: "#FFFFFF",
			solidOrphan: "#5C3D00",
			solidOrphanText: "#FFFFFF"
		}
	},
	dark: {
		standard: {
			canvas: "#0E1419",
			surface: "#161D24",
			surfaceRaised: "#1D262E",
			surfaceSunken: "#0A0F13",
			textPrimary: "#E8EDF2",
			textSecondary: "#C3CCD6",
			textMuted: "#94A1AE",
			edge: "#2E3942",
			focus: "#61A5C2",
			accentTerracotta: "#61A5C2",
			accentMoss: "#5FBF98",
			accentSlate: "#89C2D9",
			accentViolet: "#B3A3D9",
			statusSuccess: "#5FBF98",
			statusWarning: "#E0A93C",
			statusDanger: "#F08C7E",
			statusPending: "#94A1AE",
			statusInProgress: "#61A5C2",
			statusSuccessSurface: "rgba(95, 191, 152, 0.16)",
			statusSuccessBorder: "rgba(95, 191, 152, 0.3)",
			statusWarningSurface: "rgba(224, 169, 60, 0.16)",
			statusWarningBorder: "rgba(224, 169, 60, 0.3)",
			statusDangerSurface: "rgba(240, 140, 126, 0.16)",
			statusDangerBorder: "rgba(240, 140, 126, 0.3)",
			statusPendingSurface: "rgba(148, 161, 174, 0.14)",
			statusPendingBorder: "rgba(148, 161, 174, 0.26)",
			statusInProgressSurface: "rgba(97, 165, 194, 0.14)",
			statusInProgressBorder: "rgba(97, 165, 194, 0.26)",
			statusInfoSurface: "rgba(137, 194, 217, 0.16)",
			statusInfoBorder: "rgba(137, 194, 217, 0.3)",
			accentVioletSurface: "rgba(179, 163, 217, 0.16)",
			accentVioletBorder: "rgba(179, 163, 217, 0.3)",
			primaryForeground: "#081826",
			inputBorder: "#627180",
			actionOutlineBorder: "rgba(232, 237, 242, 0.30)",
			tableRowHover: "rgba(255, 255, 255, 0.06)",
			statAccentNeutral: "rgba(232, 237, 242, 0.16)",
			solidPrimary: "#014F86",
			solidPrimaryEdge: "#012A4A",
			solidPrimaryText: "#EFF6FB",
			solidNeutral: "#2E3942",
			solidNeutralEdge: "#0E1419",
			solidNeutralText: "#E8EDF2",
			solidDanger: "#7A241F",
			solidDangerEdge: "#4A1512",
			solidDangerText: "#FDECEA",
			solidDraft: "#3E4A55",
			solidDraftText: "#E8EDF2",
			solidOrphan: "#7A4E00",
			solidOrphanText: "#FFF1D6"
		},
		high: {
			canvas: "#000000",
			surface: "#0A0A0A",
			surfaceRaised: "#121212",
			surfaceSunken: "#050505",
			textPrimary: "#FFFFFF",
			textSecondary: "#EDEDED",
			textMuted: "#D0D0D0",
			edge: "#9AA6B2",
			focus: "#A9D6E5",
			accentTerracotta: "#A9D6E5",
			accentMoss: "#8FE3C0",
			accentSlate: "#C4E4F2",
			accentViolet: "#D4C6F5",
			statusSuccess: "#8FE3C0",
			statusWarning: "#FFD166",
			statusDanger: "#FFB4A8",
			statusPending: "#D0D0D0",
			statusInProgress: "#A9D6E5",
			statusSuccessSurface: "rgba(143, 227, 192, 0.18)",
			statusSuccessBorder: "rgba(143, 227, 192, 0.36)",
			statusWarningSurface: "rgba(255, 209, 102, 0.18)",
			statusWarningBorder: "rgba(255, 209, 102, 0.36)",
			statusDangerSurface: "rgba(255, 180, 168, 0.18)",
			statusDangerBorder: "rgba(255, 180, 168, 0.36)",
			statusPendingSurface: "rgba(208, 208, 208, 0.16)",
			statusPendingBorder: "rgba(208, 208, 208, 0.32)",
			statusInProgressSurface: "rgba(169, 214, 229, 0.16)",
			statusInProgressBorder: "rgba(169, 214, 229, 0.32)",
			statusInfoSurface: "rgba(196, 228, 242, 0.18)",
			statusInfoBorder: "rgba(196, 228, 242, 0.36)",
			accentVioletSurface: "rgba(212, 198, 245, 0.18)",
			accentVioletBorder: "rgba(212, 198, 245, 0.36)",
			primaryForeground: "#000000",
			inputBorder: "#9AA6B2",
			actionOutlineBorder: "rgba(255, 255, 255, 0.42)",
			tableRowHover: "rgba(255, 255, 255, 0.1)",
			statAccentNeutral: "rgba(255, 255, 255, 0.22)",
			solidPrimary: "#00335C",
			solidPrimaryEdge: "#001C33",
			solidPrimaryText: "#FFFFFF",
			solidNeutral: "#1A1F26",
			solidNeutralEdge: "#000000",
			solidNeutralText: "#FFFFFF",
			solidDanger: "#6E1512",
			solidDangerEdge: "#420C0A",
			solidDangerText: "#FFFFFF",
			solidDraft: "#2C353E",
			solidDraftText: "#FFFFFF",
			solidOrphan: "#5C3D00",
			solidOrphanText: "#FFFFFF"
		}
	}
} as const;

/** Canonical PV scale accents for this platform, resolved from brand/tokens.json. */
export const GENERATED_SCALE_ACCENTS = {
	provision: "#0A4A31",
	variety: "#C2410C",
	challenge: "#26708F",
	sociability: "#7C3560"
} as const;

/** Headline construct accents (Play Value / Usability), shared verbatim with copa-mobile. */
export const GENERATED_CONSTRUCT_ACCENTS = {
	playValue: "#4A3F99",
	usability: "#985952"
} as const;

/** Row tints distinguishing Place Audit from Place Survey rows in combined reports. */
export const GENERATED_REPORT_SOURCE_COLORS = {
	auditTint: "#FEF3C7",
	surveyTint: "#D9EAF5"
} as const;

/** Inlined into the server-rendered static-map placeholder SVG, which cannot read CSS variables. */
export const GENERATED_MAP_PLACEHOLDER_COLORS = {
	surface: "#F7F9FB",
	panel: "#EFF6FB",
	panelBorder: "#A9D6E5",
	title: "#013A63",
	body: "#3A424B"
} as const;

/** Decorative wash and hero scrims on the public pages, emitted as CSS custom properties. */
export const GENERATED_LANDING_COLORS = {
	textureWarm: "rgba(1, 73, 124, 0.08)",
	textureCool: "rgba(44, 125, 160, 0.06)",
	heroShadowSoft: "rgba(1, 42, 74, 0.22)",
	heroShadowMedium: "rgba(1, 42, 74, 0.26)",
	heroShadowStrong: "rgba(1, 42, 74, 0.3)",
	heroShadowDeep: "rgba(1, 42, 74, 0.32)"
} as const;

/** Always-dark code pane for the raw-JSON inspector. Does not follow the app theme. */
export const GENERATED_CODE_VIEWER_COLORS = {
	surface: "#0A1017",
	surfaceRaised: "#101922",
	gutter: "#101922",
	rowStripe: "#0C131A",
	edge: "rgba(169, 214, 229, 0.12)",
	edgeSubtle: "rgba(169, 214, 229, 0.06)",
	hover: "rgba(169, 214, 229, 0.08)",
	textPrimary: "#E8EDF2",
	textSecondary: "#C3CCD6",
	textMuted: "#8595A4",
	punctuation: "#8595A4",
	key: "#89C2D9",
	string: "#7FD6AE",
	number: "#E0A93C",
	boolean: "#C0ADEC",
	chromeWarning: "rgba(224, 169, 60, 0.8)",
	chromeSuccess: "rgba(127, 214, 174, 0.8)",
	chromeDanger: "rgba(240, 140, 126, 0.8)",
	shadowRing: "rgba(169, 214, 229, 0.02)",
	shadowDrop: "rgba(0, 0, 0, 0.35)"
} as const;

/** Badges on a scrim over an arbitrary image. Always dark - neither half follows the theme. */
export const GENERATED_OVERLAY_BADGE_COLORS = {
	scrim: "rgba(0, 0, 0, 0.75)",
	text: "#FFFFFF",
	textPending: "#E0A93C"
} as const;

/** Cloudinary upload widget frame overlay - the widget takes a plain colour string. */
export const GENERATED_UPLOAD_WIDGET_COLORS = {
	frameOverlay: "rgba(8, 24, 38, 0.45)"
} as const;
