/**
 * Centralized design tokens shared across the web workspace.
 *
 * The values in this file intentionally drive CSS custom properties so the
 * visual system can be reused by other applications without copying raw class
 * names or editing multiple CSS files.
 */

import { getPvScaleCssVariables } from "@/lib/audit/scale-colors";
import { GENERATED_PALETTES } from "@/lib/design-system.generated";

export type DesignSystemThemeMode = "light" | "dark";
export type DesignSystemContrastMode = "standard" | "high";

interface DesignSystemPalette {
	readonly canvas: string;
	readonly surface: string;
	readonly surfaceRaised: string;
	readonly surfaceSunken: string;
	readonly textPrimary: string;
	readonly textSecondary: string;
	readonly textMuted: string;
	readonly edge: string;
	readonly focus: string;
	readonly accentTerracotta: string;
	readonly accentMoss: string;
	readonly accentSlate: string;
	readonly accentViolet: string;
	readonly statusSuccess: string;
	readonly statusWarning: string;
	readonly statusDanger: string;
	readonly statusPending: string;
	readonly statusInProgress: string;
	readonly statusSuccessSurface: string;
	readonly statusSuccessBorder: string;
	readonly statusWarningSurface: string;
	readonly statusWarningBorder: string;
	readonly statusDangerSurface: string;
	readonly statusDangerBorder: string;
	readonly statusPendingSurface: string;
	readonly statusPendingBorder: string;
	readonly statusInProgressSurface: string;
	readonly statusInProgressBorder: string;
	readonly statusInfoSurface: string;
	readonly statusInfoBorder: string;
	readonly primaryForeground: string;
	readonly inputBorder: string;
	readonly actionOutlineBorder: string;
	readonly tableRowHover: string;
	readonly statAccentNeutral: string;
	// Warm Brutalism solid-block tokens - drive bru-* classes and button/badge components
	readonly solidPrimary: string;
	readonly solidPrimaryEdge: string;
	readonly solidPrimaryText: string;
	readonly solidNeutral: string;
	readonly solidNeutralEdge: string;
	readonly solidNeutralText: string;
	readonly solidDanger: string;
	readonly solidDangerEdge: string;
	readonly solidDangerText: string;
	readonly solidDraft: string;
	readonly solidDraftText: string;
	readonly solidOrphan: string;
	readonly solidOrphanText: string;
}

interface DesignSystemVariableInput {
	readonly theme: DesignSystemThemeMode;
	readonly contrast: DesignSystemContrastMode;
	readonly fontScale?: number;
	readonly dyslexicFont?: boolean;
}

export const DESIGN_SYSTEM = {
	defaultTheme: "dark",
	defaultContrast: "standard",
	fontScale: {
		min: 0.85,
		max: 1.3,
		default: 1
	},
	radii: {
		sm: "4px",
		md: "6px",
		lg: "8px",
		xl: "10px",
		"2xl": "12px",
		"3xl": "14px",
		"4xl": "16px"
	},
	typography: {
		pageTitle: {
			size: "1.875rem",
			sizeDesktop: "2.25rem",
			lineHeight: "1.25",
			tracking: "-0.025em",
			weight: "600"
		},
		sectionTitle: {
			size: "1.25rem",
			sizeDesktop: "1.375rem",
			lineHeight: "1.2",
			tracking: "-0.01em",
			weight: "600"
		},
		eyebrow: {
			size: "0.75rem",
			tracking: "0.12em",
			weight: "600"
		},
		workspaceLabel: {
			size: "0.75rem",
			tracking: "0.08em",
			weight: "600"
		}
	},
	fonts: {
		body: {
			variable: "--font-body",
			loader: {
				subsets: ["latin"]
			},
			stack: 'var(--font-body), "Geist", sans-serif'
		},
		heading: {
			variable: "--font-heading",
			loader: {
				subsets: ["latin"],
				weight: ["500", "700"]
			},
			stack: 'var(--font-heading), "Space Grotesk", var(--font-body), sans-serif'
		},
		mono: {
			variable: "--font-code",
			loader: {
				subsets: ["latin"]
			},
			stack: 'var(--font-code), "JetBrains Mono", ui-monospace, monospace'
		},
		dyslexicStack: '"OpenDyslexic"',
		dyslexicFont: false
	},
	palettes: GENERATED_PALETTES satisfies Record<
		DesignSystemThemeMode,
		Record<DesignSystemContrastMode, DesignSystemPalette>
	>
} as const;

/**
 * Clamp requested font scaling into the supported application range.
 */
export function clampDesignSystemFontScale(scale: number): number {
	return Math.round(Math.max(DESIGN_SYSTEM.fontScale.min, Math.min(DESIGN_SYSTEM.fontScale.max, scale)) * 100) / 100;
}

/**
 * Resolve a CSS custom-property map for the active theme and contrast mode.
 */
export function getDesignSystemCssVariables(input: Readonly<DesignSystemVariableInput>): Record<string, string> {
	const palette = DESIGN_SYSTEM.palettes[input.theme][input.contrast];
	const fontScale = clampDesignSystemFontScale(input.fontScale ?? DESIGN_SYSTEM.fontScale.default);

	return {
		...getPvScaleCssVariables(),
		"--radius": "6px",
		"--app-font-scale": String(fontScale),
		"--font-body-stack": input.dyslexicFont ? DESIGN_SYSTEM.fonts.dyslexicStack : DESIGN_SYSTEM.fonts.body.stack,
		"--font-heading-stack": input.dyslexicFont
			? DESIGN_SYSTEM.fonts.dyslexicStack
			: DESIGN_SYSTEM.fonts.heading.stack,
		"--font-code-stack": DESIGN_SYSTEM.fonts.mono.stack,
		"--font-body-active": input.dyslexicFont ? DESIGN_SYSTEM.fonts.dyslexicStack : DESIGN_SYSTEM.fonts.body.stack,
		"--font-heading-active": input.dyslexicFont
			? DESIGN_SYSTEM.fonts.dyslexicStack
			: DESIGN_SYSTEM.fonts.heading.stack,
		"--font-code-active": input.dyslexicFont ? DESIGN_SYSTEM.fonts.dyslexicStack : DESIGN_SYSTEM.fonts.mono.stack,
		"--font-dyslexic": DESIGN_SYSTEM.fonts.dyslexicStack,
		"--canvas": palette.canvas,
		"--surface": palette.surface,
		"--surface-raised": palette.surfaceRaised,
		"--surface-sunken": palette.surfaceSunken,
		"--text-primary": palette.textPrimary,
		"--text-secondary": palette.textSecondary,
		"--text-muted": palette.textMuted,
		"--ink": palette.textPrimary,
		"--ink-muted": palette.textSecondary,
		"--edge": palette.edge,
		"--focus": palette.focus,
		"--accent-terracotta": palette.accentTerracotta,
		"--accent-moss": palette.accentMoss,
		"--accent-slate": palette.accentSlate,
		"--accent-violet": palette.accentViolet,
		"--status-success": palette.statusSuccess,
		"--status-warning": palette.statusWarning,
		"--status-danger": palette.statusDanger,
		"--status-complete": palette.statusSuccess,
		"--status-in-progress": palette.statusInProgress,
		"--status-pending": palette.statusPending,
		"--status-success-surface": palette.statusSuccessSurface,
		"--status-success-border": palette.statusSuccessBorder,
		"--status-warning-surface": palette.statusWarningSurface,
		"--status-warning-border": palette.statusWarningBorder,
		"--status-danger-surface": palette.statusDangerSurface,
		"--status-danger-border": palette.statusDangerBorder,
		"--status-pending-surface": palette.statusPendingSurface,
		"--status-pending-border": palette.statusPendingBorder,
		"--status-in-progress-surface": palette.statusInProgressSurface,
		"--status-in-progress-border": palette.statusInProgressBorder,
		"--status-info-surface": palette.statusInfoSurface,
		"--status-info-border": palette.statusInfoBorder,
		"--background": palette.canvas,
		"--foreground": palette.textPrimary,
		"--card": palette.surface,
		"--card-foreground": palette.textPrimary,
		"--popover": palette.surfaceRaised,
		"--popover-foreground": palette.textPrimary,
		"--primary": palette.accentTerracotta,
		"--primary-foreground": palette.primaryForeground,
		"--secondary": palette.surfaceRaised,
		"--secondary-foreground": palette.textPrimary,
		"--muted": palette.surfaceSunken,
		"--muted-foreground": palette.textSecondary,
		"--accent": palette.surfaceRaised,
		"--accent-foreground": palette.textPrimary,
		"--destructive": palette.statusDanger,
		"--border": palette.edge,
		"--input": palette.surface,
		"--input-border": palette.inputBorder,
		"--ring": palette.focus,
		"--chart-1": palette.accentTerracotta,
		"--chart-2": palette.statusSuccess,
		"--chart-3": palette.accentSlate,
		"--chart-4": palette.statusWarning,
		"--chart-5": palette.accentViolet,
		"--sidebar": palette.surface,
		"--sidebar-foreground": palette.textPrimary,
		"--sidebar-primary": palette.accentTerracotta,
		"--sidebar-primary-foreground": palette.primaryForeground,
		"--sidebar-accent": palette.surfaceRaised,
		"--sidebar-accent-foreground": palette.textPrimary,
		"--sidebar-border": palette.edge,
		"--sidebar-ring": palette.focus,
		"--action-outline-border": palette.actionOutlineBorder,
		"--table-row-hover": palette.tableRowHover,
		"--stat-accent-neutral": palette.statAccentNeutral,
		"--stat-accent-info": palette.accentSlate,
		"--page-title-size": DESIGN_SYSTEM.typography.pageTitle.size,
		"--page-title-size-lg": DESIGN_SYSTEM.typography.pageTitle.sizeDesktop,
		"--page-title-line-height": DESIGN_SYSTEM.typography.pageTitle.lineHeight,
		"--page-title-tracking": DESIGN_SYSTEM.typography.pageTitle.tracking,
		"--page-title-weight": DESIGN_SYSTEM.typography.pageTitle.weight,
		"--section-title-size": DESIGN_SYSTEM.typography.sectionTitle.size,
		"--section-title-size-lg": DESIGN_SYSTEM.typography.sectionTitle.sizeDesktop,
		"--section-title-line-height": DESIGN_SYSTEM.typography.sectionTitle.lineHeight,
		"--section-title-tracking": DESIGN_SYSTEM.typography.sectionTitle.tracking,
		"--section-title-weight": DESIGN_SYSTEM.typography.sectionTitle.weight,
		"--eyebrow-size": DESIGN_SYSTEM.typography.eyebrow.size,
		"--eyebrow-tracking": DESIGN_SYSTEM.typography.eyebrow.tracking,
		"--eyebrow-weight": DESIGN_SYSTEM.typography.eyebrow.weight,
		"--workspace-label-size": DESIGN_SYSTEM.typography.workspaceLabel.size,
		"--workspace-label-tracking": DESIGN_SYSTEM.typography.workspaceLabel.tracking,
		"--workspace-label-weight": DESIGN_SYSTEM.typography.workspaceLabel.weight,
		"--solid-primary": palette.solidPrimary,
		"--solid-primary-edge": palette.solidPrimaryEdge,
		"--solid-primary-text": palette.solidPrimaryText,
		"--solid-neutral": palette.solidNeutral,
		"--solid-neutral-edge": palette.solidNeutralEdge,
		"--solid-neutral-text": palette.solidNeutralText,
		"--solid-danger": palette.solidDanger,
		"--solid-danger-edge": palette.solidDangerEdge,
		"--solid-danger-text": palette.solidDangerText,
		"--solid-draft": palette.solidDraft,
		"--solid-draft-text": palette.solidDraftText,
		"--solid-orphan": palette.solidOrphan,
		"--solid-orphan-text": palette.solidOrphanText
	};
}

/**
 * Apply the active design-token values to a specific DOM element.
 */
export function applyDesignSystemVariables(element: HTMLElement, input: Readonly<DesignSystemVariableInput>): void {
	const variables = getDesignSystemCssVariables(input);

	for (const [propertyName, propertyValue] of Object.entries(variables)) {
		element.style.setProperty(propertyName, propertyValue);
	}
}
