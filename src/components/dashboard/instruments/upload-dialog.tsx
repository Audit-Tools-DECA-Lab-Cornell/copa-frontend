import { AlertTriangle, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";

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

import { resolveBaseLang } from "./instrument-edit-context";
import { saveBlockers, scanInstrumentIssues } from "./instrument-issues";
import type { InstrumentContent } from "./types";

/** How many problems to name before summarising the rest. */
const LISTED_ISSUE_LIMIT = 4;

export function UploadDialog({
	open,
	isPending,
	serverError = null,
	onUpload,
	onEditCopy,
	onClose
}: Readonly<{
	open: boolean;
	isPending: boolean;
	/** A rejection from the last attempt. The dialog stays open and keeps the file. */
	serverError?: string | null;
	onUpload: (version: string, content: InstrumentContent, activate: boolean) => void;
	/** Open the uploaded file in the editor instead of sending it, so it can be fixed. */
	onEditCopy: (version: string, content: InstrumentContent) => void;
	onClose: () => void;
}>) {
	const t = useTranslations("admin.instruments");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [version, setVersion] = useState("");
	const [lang, setLang] = useState<string | string[]>(["en"]);
	const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
	const [parseError, setParseError] = useState<string | null>(null);

	const content = useMemo<InstrumentContent | null>(() => {
		if (!parsed) return null;
		return typeof lang === "string"
			? ({ [lang]: parsed as unknown as PlayspaceInstrument } as InstrumentContent)
			: (Object.fromEntries(
					Object.entries(parsed).map(([key, value]) => [key, value as unknown as PlayspaceInstrument])
				) as unknown as InstrumentContent);
	}, [parsed, lang]);

	// Checked here so a file with answers that cannot be told apart is caught
	// before it is sent, with the option to fix it in the editor.
	const blocking = useMemo(() => {
		if (!content) return [];
		try {
			return saveBlockers(scanInstrumentIssues(content, resolveBaseLang(content)));
		} catch {
			// A file that is not shaped like an instrument at all is reported by the
			// server; the scan is not the place to explain that.
			return [];
		}
	}, [content]);

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
		if (!content || version.trim().length === 0 || blocking.length > 0) return;
		onUpload(version.trim(), content, activate);
	}

	function handleClose() {
		setVersion("");
		setLang("en");
		setParsed(null);
		setParseError(null);
		onClose();
	}

	const ready = content !== null && version.trim().length > 0;
	const sendDisabled = !ready || isPending || blocking.length > 0;

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
								<Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
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
						{parseError && (
							<p role="alert" className="text-sm text-destructive">
								{parseError}
							</p>
						)}
					</div>

					{blocking.length > 0 ? (
						<div
							role="alert"
							className="space-y-1.5 rounded-md border border-status-error-border bg-status-error-surface/20 px-3 py-2.5">
							<p className="flex items-center gap-2 text-sm font-medium text-foreground">
								<AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
								{t("upload.issuesTitle", { count: blocking.length })}
							</p>
							<p className="text-xs leading-relaxed text-muted-foreground">{t("upload.issuesBody")}</p>
							<ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
								{blocking.slice(0, LISTED_ISSUE_LIMIT).map(issue => (
									<li key={issue.id}>
										<span className="font-mono">{issue.location}</span>
									</li>
								))}
								{blocking.length > LISTED_ISSUE_LIMIT && (
									<li>{t("upload.issuesMore", { count: blocking.length - LISTED_ISSUE_LIMIT })}</li>
								)}
							</ul>
						</div>
					) : null}

					{/* A rejected attempt keeps the file, the version and the language. */}
					{serverError ? (
						<div
							role="alert"
							className="space-y-1 rounded-md border border-status-error-border bg-status-error-surface/20 px-3 py-2.5">
							<p className="text-sm font-medium text-foreground">{t("upload.serverRejected")}</p>
							<p className="text-xs leading-relaxed text-muted-foreground">{serverError}</p>
						</div>
					) : null}
				</div>
				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClose}>
						{t("upload.cancel")}
					</Button>
					<Button
						variant="ghost"
						disabled={!ready || isPending}
						onClick={() => {
							if (content) onEditCopy(version.trim(), content);
						}}>
						{t("upload.editCopy")}
					</Button>
					<Button
						variant="secondary"
						disabled={sendDisabled}
						title={blocking.length > 0 ? t("upload.issuesBlockSend") : undefined}
						onClick={() => handleSubmit(false)}>
						{t("upload.saveDraft")}
					</Button>
					<Button
						disabled={sendDisabled}
						title={blocking.length > 0 ? t("upload.issuesBlockSend") : undefined}
						onClick={() => handleSubmit(true)}>
						{t("upload.publishActive")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
