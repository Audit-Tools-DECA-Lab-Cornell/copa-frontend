import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useInstrumentEdit } from "../instrument-edit-context";
import { AiTranslateFieldButton } from "../ai-translate-button";

export function PreambleEditor({
	preamble,
	onChange
}: Readonly<{
	preamble: string[];
	onChange: (preamble: string[]) => void;
}>) {
	const t = useTranslations("admin.instruments.content");
	const { translationMode } = useInstrumentEdit();

	function updateParagraph(index: number, value: string) {
		const next = [...preamble];
		next[index] = value;
		onChange(next);
	}

	function addParagraph() {
		onChange([...preamble, ""]);
	}

	function removeParagraph(index: number) {
		onChange(preamble.filter((_, i) => i !== index));
	}

	return (
		<Card>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm">{t("preamble")}</CardTitle>
					{!translationMode && (
						<Button variant="outline" size="sm" onClick={addParagraph}>
							<Plus className="mr-1.5 h-3.5 w-3.5" />
							{t("addParagraph")}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{preamble.length === 0 && (
					<p className="py-4 text-center text-sm text-muted-foreground">{t("noContent")}</p>
				)}
				{preamble.map((text, idx) => (
					<div key={idx} className="flex gap-2">
						<div className="min-w-0 flex-1">
							<Textarea
								className="min-h-[80px] text-sm"
								value={text}
								onChange={e => updateParagraph(idx, e.target.value)}
							/>
						</div>
						{translationMode ? (
							<AiTranslateFieldButton className="mt-1" />
						) : (
							<Button
								variant="ghost"
								size="icon"
								className="shrink-0 text-destructive hover:text-destructive"
								onClick={() => removeParagraph(idx)}>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
