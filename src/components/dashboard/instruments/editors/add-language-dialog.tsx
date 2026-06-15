"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { COMMON_LANGUAGES, languageLabel } from "../instrument-edit-context";

const CUSTOM_VALUE = "__custom__";

/**
 * Guided dialog for adding a translation language to an instrument.
 *
 * Improves on a raw prompt() by offering a curated language dropdown (with a
 * custom-code escape hatch) and an explicit "copy structure from" source so the
 * new language always starts from a complete, key-aligned skeleton.
 */
export function AddLanguageDialog({
	open,
	existingLangs,
	baseLang,
	onClose,
	onAdd
}: Readonly<{
	open: boolean;
	existingLangs: string[];
	baseLang: string;
	onClose: () => void;
	onAdd: (newLang: string, copyFromLang: string) => void;
}>) {
	const t = useTranslations("admin.instruments.content");

	const [selected, setSelected] = useState<string>("");
	const [customCode, setCustomCode] = useState("");
	const [copyFrom, setCopyFrom] = useState<string>(baseLang);

	const availablePresets = useMemo(
		() => COMMON_LANGUAGES.filter(l => !existingLangs.includes(l.code)),
		[existingLangs]
	);

	const resolvedCode = (selected === CUSTOM_VALUE ? customCode : selected).trim().toLowerCase();
	const isDuplicate = resolvedCode.length > 0 && existingLangs.includes(resolvedCode);
	const canAdd = resolvedCode.length > 0 && !isDuplicate;

	function reset() {
		setSelected("");
		setCustomCode("");
		setCopyFrom(baseLang);
	}

	function handleAdd() {
		if (!canAdd) return;
		onAdd(resolvedCode, copyFrom);
		reset();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!next) {
					reset();
					onClose();
				}
			}}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Languages className="h-4 w-4" />
						{t("addLanguageTitle")}
					</DialogTitle>
					<DialogDescription>{t("addLanguageDesc")}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">{t("addLanguageSelectLabel")}</Label>
						<Select value={selected} onValueChange={setSelected}>
							<SelectTrigger>
								<SelectValue placeholder={t("addLanguagePlaceholder")} />
							</SelectTrigger>
							<SelectContent>
								{availablePresets.map(l => (
									<SelectItem key={l.code} value={l.code}>
										{l.label}
									</SelectItem>
								))}
								<SelectItem value={CUSTOM_VALUE}>{t("addLanguageCustom")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{selected === CUSTOM_VALUE && (
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">{t("addLanguageCodeLabel")}</Label>
							<Input
								autoFocus
								value={customCode}
								placeholder="es"
								className="font-mono"
								onChange={e => setCustomCode(e.target.value)}
							/>
						</div>
					)}

					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">{t("addLanguageCopyFrom")}</Label>
						<Select value={copyFrom} onValueChange={setCopyFrom}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{existingLangs.map(lang => (
									<SelectItem key={lang} value={lang}>
										{languageLabel(lang)}
										{lang === baseLang ? ` (${t("baseLanguageTag")})` : ""}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground/80">{t("addLanguageCopyHint")}</p>
					</div>

					{isDuplicate && <p className="text-xs text-destructive">{t("languageExists")}</p>}
				</div>

				<DialogFooter>
					<Button variant="ghost" onClick={onClose}>
						{t("cancel")}
					</Button>
					<Button onClick={handleAdd} disabled={!canAdd}>
						{t("addLanguageConfirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
