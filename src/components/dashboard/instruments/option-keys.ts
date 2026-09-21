/**
 * Identity rules for the answers an admin adds to a question.
 *
 * An answer is stored by its key, so two answers that share one cannot be told
 * apart in a report and a key that changes later re-points every audit that
 * already chose it. Adding an answer therefore mints a key once, and the saved
 * key never follows the label.
 *
 * The helpers here are pure so the editor, its tests, and the repair flow all
 * reach the same verdict. They mirror the backend rules in
 * `app/products/playspace/services/instrument.py`.
 */

import type { ChoiceOption, ScaleOption } from "@/types/audit";

/** Scalar answers persist the chosen key in a String(80) column. */
export const OPTION_KEY_MAX_LENGTH = 80;

/** The key a freshly added row used to carry; it identifies an unnamed row, never an answer. */
export const PLACEHOLDER_OPTION_KEY = "new_option";

/**
 * Scale-answer keys that arriving audits are rewritten away from, so a newly
 * authored answer must not claim one (backend `audit_state.py`).
 */
export const RESERVED_SCALE_OPTION_KEYS: ReadonlySet<string> = new Set([
	"no_diversity",
	"some_diversity",
	"a_lot_of_diversity"
]);

/**
 * Answers whose behaviour is wired to their key. A generic add or override
 * cannot claim one; the editor offers them as presets instead.
 */
export const SEMANTIC_OPTION_KEYS: ReadonlySet<string> = new Set([
	"unsure",
	"other",
	"play_alone",
	"small_group",
	"large_group"
]);

/** Shape an admin may type when they want to choose the key themselves. */
export const OPTION_KEY_OVERRIDE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Prefix that makes a generated key recognisable in raw JSON. Never used to decide behaviour. */
const GENERATED_KEY_PREFIX = "opt_";

/** How many times to re-roll before reporting that a key could not be minted. */
const GENERATION_ATTEMPTS = 5;

export type OptionKeyIssueCode =
	"blank" | "padded" | "tooLong" | "placeholder" | "reserved" | "semantic" | "duplicate" | "syntax";

export type OptionKeyCheck = { ok: true } | { ok: false; code: OptionKeyIssueCode };

/** Random-hex source, injectable so collision handling can be tested deterministically. */
export type KeyGenerator = () => string;

function randomHex(): string {
	const globalCrypto = typeof globalThis === "undefined" ? undefined : globalThis.crypto;
	if (globalCrypto?.randomUUID) {
		return globalCrypto.randomUUID().replace(/-/g, "");
	}
	if (globalCrypto?.getRandomValues) {
		const bytes = globalCrypto.getRandomValues(new Uint8Array(16));
		return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
	}
	return "";
}

/** Mint one candidate key. Returns an empty string when no random source is available. */
export const defaultKeyGenerator: KeyGenerator = () => {
	const hex = randomHex();
	return hex.length === 0 ? "" : `${GENERATED_KEY_PREFIX}${hex}`;
};

/**
 * Mint a key that no answer in `taken` already uses.
 *
 * Returns `null` rather than falling back to a fixed or blank key: a row that
 * cannot be told apart from its siblings must not be added at all.
 */
export function mintOptionKey(taken: ReadonlySet<string>, generate: KeyGenerator = defaultKeyGenerator): string | null {
	for (let attempt = 0; attempt < GENERATION_ATTEMPTS; attempt += 1) {
		const candidate = generate();
		if (candidate.length === 0 || candidate.length > OPTION_KEY_MAX_LENGTH) {
			continue;
		}
		if (!taken.has(candidate)) {
			return candidate;
		}
	}
	return null;
}

/** True when a key looks like one this editor minted. Presentation only. */
export function isGeneratedOptionKey(key: string): boolean {
	return key.startsWith(GENERATED_KEY_PREFIX);
}

/**
 * Check a key an admin typed for themselves.
 *
 * `taken` holds every key the owning list already uses plus the keys retired
 * during this editing session, so a delete-then-add sequence cannot quietly
 * reuse the meaning an existing audit answer already has.
 */
export function checkOptionKeyOverride(
	candidate: string,
	taken: ReadonlySet<string>,
	{ scaleOption }: { scaleOption: boolean }
): OptionKeyCheck {
	if (candidate.length === 0) {
		return { ok: false, code: "blank" };
	}
	if (candidate !== candidate.trim()) {
		return { ok: false, code: "padded" };
	}
	if (candidate.length > OPTION_KEY_MAX_LENGTH) {
		return { ok: false, code: "tooLong" };
	}
	if (candidate === PLACEHOLDER_OPTION_KEY) {
		return { ok: false, code: "placeholder" };
	}
	if (!OPTION_KEY_OVERRIDE_PATTERN.test(candidate)) {
		return { ok: false, code: "syntax" };
	}
	if (scaleOption && RESERVED_SCALE_OPTION_KEYS.has(candidate)) {
		return { ok: false, code: "reserved" };
	}
	if (SEMANTIC_OPTION_KEYS.has(candidate)) {
		return { ok: false, code: "semantic" };
	}
	if (taken.has(candidate)) {
		return { ok: false, code: "duplicate" };
	}
	return { ok: true };
}

/** Check a key already present in stored content, using the same rules as the backend. */
export function checkStoredOptionKey(
	key: string,
	seenBefore: ReadonlySet<string>,
	{ scaleOption }: { scaleOption: boolean }
): OptionKeyCheck {
	if (key.trim().length === 0) {
		return { ok: false, code: "blank" };
	}
	if (key !== key.trim()) {
		return { ok: false, code: "padded" };
	}
	if (key.length > OPTION_KEY_MAX_LENGTH) {
		return { ok: false, code: "tooLong" };
	}
	if (key === PLACEHOLDER_OPTION_KEY) {
		return { ok: false, code: "placeholder" };
	}
	if (scaleOption && RESERVED_SCALE_OPTION_KEYS.has(key)) {
		return { ok: false, code: "reserved" };
	}
	if (seenBefore.has(key)) {
		return { ok: false, code: "duplicate" };
	}
	return { ok: true };
}

// ─── Owning lists ────────────────────────────────────────────────────────────

/**
 * Where one list of answers lives. Addresses are built from stable keys rather
 * than array positions so an open override survives reordering and collapsing.
 */
export type OptionOwnerScope =
	| { kind: "questionScale"; sectionKey: string; questionKey: string; scaleKey: string }
	| { kind: "checklist"; sectionKey: string; questionKey: string }
	| { kind: "scaleGuidance"; scaleKey: string }
	| { kind: "preAudit"; questionKey: string }
	| { kind: "executionModes" };

/** Stable string form of a scope, for comparison and for element ids. */
export function scopeId(scope: OptionOwnerScope): string {
	switch (scope.kind) {
		case "questionScale":
			return `questionScale:${scope.sectionKey}/${scope.questionKey}/${scope.scaleKey}`;
		case "checklist":
			return `checklist:${scope.sectionKey}/${scope.questionKey}`;
		case "scaleGuidance":
			return `scaleGuidance:${scope.scaleKey}`;
		case "preAudit":
			return `preAudit:${scope.questionKey}`;
		case "executionModes":
			return "executionModes";
	}
}

/** True when this list stores scale answers, which carry the extra reserved keys. */
export function isScaleOptionScope(scope: OptionOwnerScope): boolean {
	return scope.kind === "questionScale" || scope.kind === "scaleGuidance";
}

// ─── Adding a row ────────────────────────────────────────────────────────────

export type AddOptionResult<T> = { ok: true; options: T[]; key: string } | { ok: false; code: "generatorUnavailable" };

/**
 * Append one answer with a freshly minted key.
 *
 * The candidate is checked against the list as it is right now plus the keys
 * retired this session, so repeated adds in quick succession cannot collide or
 * overwrite each other.
 */
export function appendScaleOption(
	options: readonly ScaleOption[],
	template: Omit<ScaleOption, "key">,
	retiredKeys: ReadonlySet<string>,
	generate: KeyGenerator = defaultKeyGenerator
): AddOptionResult<ScaleOption> {
	const key = mintOptionKey(takenKeys(options, retiredKeys), generate);
	if (key === null) {
		return { ok: false, code: "generatorUnavailable" };
	}
	return { ok: true, options: [...options, { ...template, key }], key };
}

export function appendChoiceOption(
	options: readonly ChoiceOption[],
	template: Omit<ChoiceOption, "key">,
	retiredKeys: ReadonlySet<string>,
	generate: KeyGenerator = defaultKeyGenerator
): AddOptionResult<ChoiceOption> {
	const key = mintOptionKey(takenKeys(options, retiredKeys), generate);
	if (key === null) {
		return { ok: false, code: "generatorUnavailable" };
	}
	return { ok: true, options: [...options, { ...template, key }], key };
}

function takenKeys(options: readonly { key: string }[], retiredKeys: ReadonlySet<string>): Set<string> {
	const taken = new Set(retiredKeys);
	for (const option of options) {
		taken.add(option.key);
	}
	return taken;
}

/** Keys the owning list already uses, excluding the row being renamed. */
export function siblingKeys(options: readonly { key: string }[], exceptKey: string): Set<string> {
	const keys = new Set<string>();
	for (const option of options) {
		if (option.key !== exceptKey) {
			keys.add(option.key);
		}
	}
	return keys;
}

export type ApplyOverrideResult<T> =
	{ ok: true; options: T[] } | { ok: false; code: OptionKeyIssueCode | "missingRow" };

/**
 * Rename one answer's key in place.
 *
 * The row is found by its current key rather than its position, so an override
 * typed before a reorder still lands on the row it was opened for - and fails
 * visibly, leaving the typed text intact, if that row is gone.
 */
export function applyOptionKeyOverride<T extends { key: string }>(
	options: readonly T[],
	currentKey: string,
	candidate: string,
	retiredKeys: ReadonlySet<string>,
	{ scaleOption }: { scaleOption: boolean }
): ApplyOverrideResult<T> {
	const index = options.findIndex(option => option.key === currentKey);
	if (index === -1) {
		return { ok: false, code: "missingRow" };
	}
	const taken = new Set(retiredKeys);
	for (const key of siblingKeys(options, currentKey)) {
		taken.add(key);
	}
	const check = checkOptionKeyOverride(candidate, taken, { scaleOption });
	if (!check.ok) {
		return { ok: false, code: check.code };
	}
	const next = options.map((option, position) => (position === index ? { ...option, key: candidate } : option));
	return { ok: true, options: next };
}
