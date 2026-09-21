"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { type OptionKeyIssueCode, type OptionOwnerScope, scopeId, SEMANTIC_OPTION_KEYS } from "./option-keys";

/**
 * What the editor remembers about keys while one instrument is open.
 *
 * Two things cannot be read back out of the draft itself. Which answers were
 * added in this session - the only ones whose key may still be changed, because
 * no audit can have chosen them yet. And which keys were used and then deleted -
 * reserved for the rest of the session so a delete-then-add sequence cannot
 * quietly give a new answer the meaning an existing audit answer already has.
 *
 * Neither is inferred from the key text or the row position, and neither is
 * written into the saved instrument.
 */

type PendingOverride = Readonly<{
	scope: OptionOwnerScope;
	scopeId: string;
	optionKey: string;
	value: string;
	/** Why the last Apply was refused, if it was. */
	code: OptionKeyIssueCode | "missingRow" | null;
}>;

type AddFailure = Readonly<{ scopeId: string }>;

type OptionKeySessionValue = Readonly<{
	pending: PendingOverride | null;
	/** Non-null while one answer's key is being typed but not yet applied. */
	hasPendingOverride: boolean;
	addFailure: AddFailure | null;
	openOverride: (scope: OptionOwnerScope, optionKey: string) => void;
	changeOverride: (value: string) => void;
	cancelOverride: () => void;
	failOverride: (code: OptionKeyIssueCode | "missingRow") => void;
	finishOverride: () => void;
	isOverrideOpenFor: (scope: OptionOwnerScope, optionKey: string) => boolean;
	canOverride: (scope: OptionOwnerScope, optionKey: string) => boolean;
	noteCreated: (scope: OptionOwnerScope, key: string) => void;
	noteRetired: (scope: OptionOwnerScope, keys: readonly string[]) => void;
	retiredKeys: (scope: OptionOwnerScope) => ReadonlySet<string>;
	reportAddFailure: (scope: OptionOwnerScope) => void;
	clearAddFailure: () => void;
}>;

const EMPTY_KEYS: ReadonlySet<string> = new Set();

const OptionKeySessionContext = createContext<OptionKeySessionValue | null>(null);

export function OptionKeySessionProvider({ children }: Readonly<{ children: ReactNode }>) {
	// Refs, not state: an add reads these in the same tick it writes them, so a
	// burst of Add clicks cannot mint the same key twice from stale state.
	const createdKeys = useRef(new Map<string, Set<string>>());
	const retiredKeysByScope = useRef(new Map<string, Set<string>>());

	const [pending, setPending] = useState<PendingOverride | null>(null);
	const [addFailure, setAddFailure] = useState<AddFailure | null>(null);

	const value = useMemo<OptionKeySessionValue>(() => {
		function bucket(store: Map<string, Set<string>>, scope: OptionOwnerScope): Set<string> {
			const id = scopeId(scope);
			const existing = store.get(id);
			if (existing) return existing;
			const created = new Set<string>();
			store.set(id, created);
			return created;
		}

		return {
			pending,
			hasPendingOverride: pending !== null,
			addFailure,
			openOverride: (scope, optionKey) =>
				setPending({ scope, scopeId: scopeId(scope), optionKey, value: optionKey, code: null }),
			changeOverride: value =>
				setPending(current => (current === null ? current : { ...current, value, code: null })),
			cancelOverride: () => setPending(null),
			failOverride: code => setPending(current => (current === null ? current : { ...current, code })),
			finishOverride: () => setPending(null),
			isOverrideOpenFor: (scope, optionKey) =>
				pending !== null && pending.scopeId === scopeId(scope) && pending.optionKey === optionKey,
			canOverride: (scope, optionKey) =>
				!SEMANTIC_OPTION_KEYS.has(optionKey) &&
				(createdKeys.current.get(scopeId(scope))?.has(optionKey) ?? false),
			noteCreated: (scope, key) => {
				bucket(createdKeys.current, scope).add(key);
			},
			noteRetired: (scope, keys) => {
				const retired = bucket(retiredKeysByScope.current, scope);
				const created = bucket(createdKeys.current, scope);
				for (const key of keys) {
					retired.add(key);
					created.delete(key);
				}
			},
			retiredKeys: scope => retiredKeysByScope.current.get(scopeId(scope)) ?? EMPTY_KEYS,
			reportAddFailure: scope => setAddFailure({ scopeId: scopeId(scope) }),
			clearAddFailure: () => setAddFailure(null)
		};
	}, [pending, addFailure]);

	return <OptionKeySessionContext.Provider value={value}>{children}</OptionKeySessionContext.Provider>;
}

/**
 * Read the key session. Returns null outside the instrument editor - the
 * read-only instrument viewer renders the same option components.
 */
export function useOptionKeySession(): OptionKeySessionValue | null {
	return useContext(OptionKeySessionContext);
}

/** Read the key session, or a no-op session when rendering outside the editor. */
export function useOptionKeySessionOrNoop(): OptionKeySessionValue {
	const session = useContext(OptionKeySessionContext);
	const fallback = useNoopSession();
	return session ?? fallback;
}

function useNoopSession(): OptionKeySessionValue {
	const noop = useCallback(() => undefined, []);
	return useMemo<OptionKeySessionValue>(
		() => ({
			pending: null,
			hasPendingOverride: false,
			addFailure: null,
			openOverride: noop,
			changeOverride: noop,
			cancelOverride: noop,
			failOverride: noop,
			finishOverride: noop,
			isOverrideOpenFor: () => false,
			canOverride: () => false,
			noteCreated: noop,
			noteRetired: noop,
			retiredKeys: () => EMPTY_KEYS,
			reportAddFailure: noop,
			clearAddFailure: noop
		}),
		[noop]
	);
}
