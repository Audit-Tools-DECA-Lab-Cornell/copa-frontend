import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import type { ChoiceOption } from "@/types/audit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableField } from "../shared-components";
import { makeDefaultExecutionMode } from "../defaults";
import { useInstrumentEdit } from "../instrument-edit-context";

export function ExecutionModesEditor({
	modes,
	onChange
}: Readonly<{
	modes: ChoiceOption[];
	onChange: (modes: ChoiceOption[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();

	function updateMode(index: number, field: keyof ChoiceOption, value: string | null) {
		const next = structuredClone(modes);
		(next[index] as Record<string, string | null | undefined>)[field] = value;
		onChange(next);
	}

	function addMode() {
		onChange([...modes, makeDefaultExecutionMode()]);
	}

	function removeMode(index: number) {
		onChange(modes.filter((_, i) => i !== index));
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("executionModes")}</CardTitle>
					{!translationMode && (
						<Button variant="outline" size="sm" onClick={addMode}>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							{t("addMode")}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{modes.map((mode, idx) => (
					<div key={idx} className="flex items-start gap-2 rounded-lg border border-edge/40 bg-card/40 p-3">
						{/*
						 * Previously `md:grid-cols-3` gave equal width to all three fields.
						 * Key is a short token (e.g. "both"), label is a sentence fragment,
						 * description is a full sentence — so we use proportional columns:
						 * key 1fr · label 2fr · description 3fr.
						 */}
						<div className="min-w-0 flex-1 grid gap-3 md:grid-cols-[1fr_2fr_3fr]">
							<EditableField
								label={t("modeKey")}
								value={mode.key}
								mono
								isKey
								onChange={v => updateMode(idx, "key", v)}
							/>
							<EditableField
								label={t("modeLabel")}
								value={mode.label}
								onChange={v => updateMode(idx, "label", v)}
							/>
							<EditableField
								label={t("modeDescription")}
								value={mode.description ?? ""}
								multiline
								onChange={v => updateMode(idx, "description", v || null)}
							/>
						</div>
						{!translationMode && (
							<Button
								variant="ghost"
								size="icon"
								className="mt-5 shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => removeMode(idx)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
