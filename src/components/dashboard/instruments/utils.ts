import React from "react";
import type { InstrumentQuestion, InstrumentSection, QuestionScale, ScaleDefinition } from "@/types/audit";

/**
 * Format a backend question key (e.g. `q_8_1`) like the execution question card (`Q 8.1`).
 */
export function formatQuestionKeyForDisplay(questionKey: string): string {
	if (!questionKey.startsWith("q_")) {
		return questionKey;
	}
	const sections = questionKey.slice(2).split("_");
	return `Q ${sections.map(section => section.toUpperCase()).join(".")}`;
}

/**
 * Convert a snake_case key like "section_1_playspace_character_community"
 * into a human-readable label "Section 1 — Playspace Character Community".
 */
export function formatSectionKey(key: string): string {
	const match = key.match(/^section_(\\d+)_(.+)$/);
	if (match) {
		const num = match[1];
		const rest = match[2]
			.split("_")
			.map(w => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
		return `Section ${num} &mdash; ${rest}`;
	}
	return key
		.split("_")
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

export function countTotalQuestions(sections: InstrumentSection[]): number {
	return sections.reduce((acc, s) => acc + s.questions.length, 0);
}

export function moveArrayItem<T>(items: readonly T[], index: number, direction: "up" | "down"): T[] {
	const targetIndex = direction === "up" ? index - 1 : index + 1;
	if (targetIndex < 0 || targetIndex >= items.length) {
		return [...items];
	}
	const next = [...items];
	const currentItem = next[index];
	const targetItem = next[targetIndex];
	if (currentItem === undefined || targetItem === undefined) {
		return next;
	}
	next[index] = targetItem;
	next[targetIndex] = currentItem;
	return next;
}

export function titleCaseToken(value: string): string {
	return value
		.split("_")
		.map(token => (token.length === 0 ? token : token.charAt(0).toUpperCase() + token.slice(1)))
		.join(" ");
}

export function formatIndexedDiffSegment(segment: string, index: number): string {
	switch (segment) {
		case "sections":
			return `Section ${index + 1}`;
		case "questions":
			return `Question ${index + 1}`;
		case "scales":
			return `Scale ${index + 1}`;
		case "options":
			return `Scale Option ${index + 1}`;
		case "scale_guidance":
			return `Scale Guidance ${index + 1}`;
		case "pre_audit_questions":
			return `Pre-Audit Question ${index + 1}`;
		case "execution_modes":
			return `Execution Mode ${index + 1}`;
		case "legal_documents":
			return `Legal Document ${index + 1}`;
		case "sections.body":
			return `Paragraph ${index + 1}`;
		case "sections.bullets":
			return `Bullet ${index + 1}`;
		default:
			return `${titleCaseToken(segment)} ${index + 1}`;
	}
}

export function formatDiffPath(path: readonly (string | number)[]): string {
	const labels: string[] = [];
	for (let index = 0; index < path.length; index += 1) {
		const segment = path[index];
		if (typeof segment === "number") {
			const previousSegment = path[index - 1];
			if (typeof previousSegment === "string") {
				labels.push(formatIndexedDiffSegment(previousSegment, segment));
				continue;
			}
			labels.push(String(segment + 1));
			continue;
		}
		const nextSegment = path[index + 1];
		if (typeof nextSegment === "number") {
			continue;
		}
		labels.push(titleCaseToken(segment));
	}
	return labels.join(" → ");
}

export function collectSectionScaleKeys(questions: InstrumentQuestion[]): string[] {
	const keys = new Set<string>();
	for (const q of questions) {
		for (const s of q.scales) {
			keys.add(s.key);
		}
	}
	return Array.from(keys);
}

const BOLD_REGEX = /\\*\\*(.+?)\\*\\*/g;

/**
 * Renders a string that may contain `**bold**` markers into React nodes,
 * splitting on the markers and wrapping matched segments in `<strong>`.
 */
export function renderInlineMarkdown(text: string): React.ReactNode {
	if (!BOLD_REGEX.test(text)) return text;

	BOLD_REGEX.lastIndex = 0;
	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;
	let keyCounter = 0;

	while ((match = BOLD_REGEX.exec(text)) !== null) {
		if (match.index > lastIndex) {
			parts.push(text.slice(lastIndex, match.index));
		}
		parts.push(React.createElement("strong", { key: keyCounter++ }, match[1]));
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		parts.push(text.slice(lastIndex));
	}

	return parts;
}

/**
 * Determines whether a question's scale options differ from the global
 * scale_guidance defaults for the same scale key.
 */
export function isScaleCustomized(questionScale: QuestionScale, defaultScale: ScaleDefinition | undefined): boolean {
	if (!defaultScale) return true;
	// just have to check that the question scale options keys exist in the default scale
	return !questionScale.options.every(opt => defaultScale.options.some(dopt => dopt.key === opt.key));
}

/** Builds a lookup map from scale key to its ScaleDefinition. */
export function buildScaleGuidanceMap(scaleGuidance: ScaleDefinition[]): Map<string, ScaleDefinition> {
	const map = new Map<string, ScaleDefinition>();
	for (const sd of scaleGuidance) {
		map.set(sd.key, sd);
	}
	return map;
}

export function bumpVersion(version: string): string {
	const parts = version.split(".");
	const last = Number(parts[parts.length - 1]);
	if (Number.isNaN(last)) {
		return `${version}.1`;
	}
	return [...parts.slice(0, -1), String(last + 1)].join(".");
}

export interface InstrumentChange {
	path: (string | number)[];
	oldValue: unknown;
	newValue: unknown;
}

export function getInstrumentChanges(
	oldContent: unknown,
	newContent: unknown,
	path: (string | number)[] = []
): InstrumentChange[] {
	const changes: InstrumentChange[] = [];

	if (oldContent === newContent) return [];

	if (
		typeof oldContent !== "object" ||
		oldContent === null ||
		typeof newContent !== "object" ||
		newContent === null
	) {
		return [{ path, oldValue: oldContent, newValue: newContent }];
	}

	const oldObj = oldContent as Record<string, unknown>;
	const newObj = newContent as Record<string, unknown>;

	const oldKeys = Object.keys(oldObj);
	const newKeys = Object.keys(newObj);
	const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

	for (const key of allKeys) {
		const currentPath = [...path, Array.isArray(oldObj) ? Number(key) : key];

		if (!(key in oldObj)) {
			changes.push({ path: currentPath, oldValue: undefined, newValue: newObj[key] });
		} else if (!(key in newObj)) {
			changes.push({ path: currentPath, oldValue: oldObj[key], newValue: undefined });
		} else {
			changes.push(...getInstrumentChanges(oldObj[key], newObj[key], currentPath));
		}
	}

	return changes;
}
