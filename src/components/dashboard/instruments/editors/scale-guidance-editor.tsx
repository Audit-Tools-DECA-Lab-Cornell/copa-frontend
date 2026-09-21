import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ScaleDefinition, ScaleKey } from "@/types/audit";

import { makeDefaultScaleDefinition } from "../defaults";
import { useInstrumentEdit } from "../instrument-edit-context";
import { useOptionKeySessionOrNoop } from "../option-key-session";
import { mintOptionKey } from "../option-keys";
import { EditableField } from "../shared-components";
import { ScaleOptionsEditor, SelectionModeField } from "./shared-editors";

export function ScaleGuidanceEditor({
	scales,
	onChange
}: Readonly<{
	scales: ScaleDefinition[];
	onChange: (scales: ScaleDefinition[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();
	const session = useOptionKeySessionOrNoop();

	function updateScale(index: number, updater: (s: ScaleDefinition) => void) {
		const next = structuredClone(scales);
		updater(next[index]);
		onChange(next);
	}

	function addScale() {
		const firstOptionKey = mintOptionKey(new Set());
		if (firstOptionKey === null) return;
		const scale = makeDefaultScaleDefinition(firstOptionKey, t("newOptionLabel"));
		session.noteCreated({ kind: "scaleGuidance", scaleKey: scale.key }, firstOptionKey);
		onChange([...scales, scale]);
	}

	function removeScale(index: number) {
		const removed = scales[index];
		if (removed) {
			session.noteRetired(
				{ kind: "scaleGuidance", scaleKey: removed.key },
				removed.options.map(option => option.key)
			);
		}
		onChange(scales.filter((_, i) => i !== index));
	}

	return (
		<div className="space-y-4">
			<SectionHeader
				as="h3"
				title={t("scaleGuidance")}
				actions={
					!translationMode ? (
						<Button onClick={addScale}>
							<Plus className="mr-1.5 h-4 w-4" />
							{t("addScale")}
						</Button>
					) : undefined
				}
			/>

			{/*
			 * Previously `lg:grid-cols-2` placed two scale cards side by side.
			 * Each scale card contains a nested ScaleOptionsEditor with 4 fields per
			 * option row, making 2-column layout extremely cramped. Single column
			 * gives each scale card the full width it needs.
			 */}
			<div className="space-y-4">
				{scales.map((scale, sIdx) => (
					<Card key={sIdx} className="border-edge/50">
						<CardHeader className="pb-3 px-4 pt-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0 flex-1 grid gap-3 sm:grid-cols-2">
									<EditableField
										label={t("scaleKey")}
										value={scale.key}
										mono
										isKey
										onChange={v =>
											updateScale(sIdx, s => {
												s.key = v as ScaleKey;
											})
										}
									/>
									<EditableField
										label={t("scaleTitle")}
										value={scale.title}
										onChange={v =>
											updateScale(sIdx, s => {
												s.title = v;
											})
										}
									/>
									<SelectionModeField
										value={scale.selection_mode ?? "single"}
										disabled={translationMode}
										onChange={mode =>
											updateScale(sIdx, s => {
												s.selection_mode = mode;
											})
										}
									/>
									<div className="col-span-full">
										<EditableField
											label={t("scalePrompt")}
											value={scale.prompt}
											onChange={v =>
												updateScale(sIdx, s => {
													s.prompt = v;
												})
											}
										/>
									</div>
									<div className="col-span-full">
										<EditableField
											label={t("scaleDescription")}
											value={scale.description}
											multiline
											onChange={v =>
												updateScale(sIdx, s => {
													s.description = v;
												})
											}
										/>
									</div>
								</div>
								{!translationMode && (
									<Button
										variant="ghost"
										size="icon"
										className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 mt-1"
										onClick={() => removeScale(sIdx)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent className="px-4 pb-4">
							<ScaleOptionsEditor
								options={scale.options}
								scope={{ kind: "scaleGuidance", scaleKey: scale.key }}
								onChange={opts =>
									updateScale(sIdx, s => {
										s.options = opts;
									})
								}
							/>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
