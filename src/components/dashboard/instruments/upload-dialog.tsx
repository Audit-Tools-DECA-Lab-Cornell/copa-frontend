import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

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
import { PlayspaceInstrument } from "@/types/audit";

import type { InstrumentContent } from "./types";

export function UploadDialog({
	open,
	isPending,
	onUpload,
	onClose
}: Readonly<{
	open: boolean;
	isPending: boolean;
	onUpload: (version: string, content: InstrumentContent, activate: boolean) => void;
	onClose: () => void;
}>) {
	const t = useTranslations("admin.instruments");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [version, setVersion] = useState("");
	const [lang, setLang] = useState<string | string[]>(["en"]);
	const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);

	function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = e => {
			try {
				const json = JSON.parse(e.target?.result as string);
				if (typeof json !== "object" || json === null) {
					setParseError(t("upload.errorJsonObj"));
					setParsed(null);
					return;
				}
				setParsed(json as Record<string, unknown>);
				setParseError(null);
			} catch {
				setParseError(t("upload.errorInvalidJson"));
				setParsed(null);
			}
		};
		reader.readAsText(file);
	}

	function handleSubmit(activate: boolean) {
		if (!parsed || version.trim().length === 0) return;
		const content =
			typeof lang === "string"
				? { [lang]: parsed as unknown as PlayspaceInstrument }
				: (Object.fromEntries(
						Object.entries(parsed).map(([k, v]) => [k, v as unknown as PlayspaceInstrument])
					) as unknown as InstrumentContent);
		onUpload(version.trim(), content, activate);
	}

	function handleClose() {
		setVersion("");
		setLang("en");
		setParsed(null);
		setParseError(null);
		onClose();
	}

	return (
		<Dialog
			open={open}
			onOpenChange={o => {
				if (!o) handleClose();
			}}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("upload.title")}</DialogTitle>
					<DialogDescription>{t("upload.description")}</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="upload-version">{t("upload.versionLabel")}</Label>
						<Input
							id="upload-version"
							placeholder="5.2.1"
							value={version}
							onChange={e => setVersion(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="upload-lang">{t("upload.languageLabel")}</Label>
						<Input
							id="upload-lang"
							placeholder="en"
							value={lang}
							onChange={e =>
								setLang(e.target.value.includes(",") ? e.target.value.split(",") : e.target.value)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label>{t("upload.fileLabel")}</Label>
						<div
							className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
							onClick={() => fileInputRef.current?.click()}
							onKeyDown={e => {
								if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
							}}
							role="button"
							tabIndex={0}
							onDragOver={e => e.preventDefault()}
							onDrop={e => {
								e.preventDefault();
								const file = e.dataTransfer.files[0];
								if (file && fileInputRef.current) {
									const dt = new DataTransfer();
									dt.items.add(file);
									fileInputRef.current.files = dt.files;
									fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
								}
							}}>
							<div className="text-center">
								<Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
								<p className="text-sm text-muted-foreground">
									{parsed
										? t("upload.fileLoaded", { keys: Object.keys(parsed).length })
										: t("upload.filePlaceholder")}
								</p>
							</div>
						</div>
						<input
							ref={fileInputRef}
							type="file"
							accept=".json,application/json"
							className="hidden"
							onChange={handleFileSelect}
						/>
						{parseError && <p className="text-sm text-destructive">{parseError}</p>}
					</div>
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClose}>
						{t("upload.cancel")}
					</Button>
					<Button
						variant="secondary"
						disabled={!parsed || version.trim().length === 0 || isPending}
						onClick={() => handleSubmit(false)}>
						{t("upload.saveDraft")}
					</Button>
					<Button
						disabled={!parsed || version.trim().length === 0 || isPending}
						onClick={() => handleSubmit(true)}>
						{t("upload.publishActive")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
