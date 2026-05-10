"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AuditSession } from "@/lib/api/playspace";
import type { PlayspaceInstrument } from "@/types/audit";
import { downloadSingleAuditExport, type AuditExportFormat } from "@/lib/export/audit";

export interface AuditExportActionsProps {
	readonly audit: AuditSession;
	readonly instrument: PlayspaceInstrument;
}

export function AuditExportActions({ audit, instrument }: AuditExportActionsProps) {
	const [isExporting, setIsExporting] = React.useState(false);

	async function handleExport(format: AuditExportFormat) {
		setIsExporting(true);
		try {
			await downloadSingleAuditExport(
				{
					auditSession: audit,
					context: {
						projectName: audit.project_name,
						city: null,
						province: null,
						country: null
					},
					auditorProfile: {
						auditorCode: audit.auditor_code,
						ageRange: null,
						gender: null,
						country: null,
						role: null
					}
				},
				instrument,
				format
			);
		} catch (error) {
			globalThis.console.error("Export error:", error instanceof Error ? error.message : "Export failed");
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={isExporting}
				onClick={() => void handleExport("pdf")}
				className="gap-1.5">
				<DownloadIcon className="size-3.5" />
				PDF
			</Button>
			<Button
				variant="outline"
				size="sm"
				disabled={isExporting}
				onClick={() => void handleExport("xlsx")}
				className="gap-1.5">
				<DownloadIcon className="size-3.5" />
				Excel
			</Button>
			<Button
				variant="outline"
				size="sm"
				disabled={isExporting}
				onClick={() => void handleExport("csv")}
				className="gap-1.5">
				<DownloadIcon className="size-3.5" />
				CSV
			</Button>
		</div>
	);
}
