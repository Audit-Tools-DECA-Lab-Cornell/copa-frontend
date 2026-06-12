import type { PlayspaceInstrument } from "@/types/audit";

/**
 * Returns the instrument fetched from the backend for rendering.
 * Instrument copy is server-authoritative; no client-side overlay is applied.
 */
export function useLocalizedInstrument(
	baseInstrumentOverride?: PlayspaceInstrument | null
): PlayspaceInstrument | null {
	return baseInstrumentOverride ?? null;
}
