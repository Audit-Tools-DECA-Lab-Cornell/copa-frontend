import { PlayspaceInstrument } from "@/types/audit";

export type Lang = "en" | "de";
export type InstrumentContent = Record<Lang | string, PlayspaceInstrument>;

export interface InstrumentVersionRow {
	id: string;
	instrument_key: string;
	version: string;
	parent_instrument_id: string | null;
	is_active: boolean;
	content: InstrumentContent;
	created_at: string;
	activated_at?: string | null;
}
