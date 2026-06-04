"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Plus } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";

import { playspaceApi } from "@/lib/api/playspace";
import { instrumentContentSchema } from "@/lib/api/playspace-types";
import type { z } from "zod";

import type { InstrumentContent, InstrumentVersionRow } from "./types";
import { QUERY_KEY, INSTRUMENTS_LIST_QUERY_KEY } from "./constants";
import { bumpVersion } from "./utils";
import { VersionHistory } from "./version-history";
import { InstrumentEditor } from "./instrument-editor";
import { ActivateDialog } from "./activate-dialog";
import { UploadDialog } from "./upload-dialog";

type InstrumentContentPayload = z.infer<typeof instrumentContentSchema>;

type SetInstrumentVars = {
	version: string;
	content: InstrumentContentPayload;
	activate?: boolean;
};

export function InstrumentsAdminClient() {
	const t = useTranslations("admin.instruments");
	const queryClient = useQueryClient();

	const [editingContent, setEditingContent] = useState<InstrumentContent | null>(null);
	const [editingVersion, setEditingVersion] = useState<string>("");
	const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
	const [versionToActivate, setVersionToActivate] = useState<InstrumentVersionRow | null>(null);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

	// Single source of truth for the version list. Both "all versions" and the
	// "active version" are derived from this one query, so a single fetch backs
	// the whole page and there is no race between two queries hitting the same
	// endpoint (which previously caused an empty-state flash and stale UI). The
	// server component prefetches this exact key, so the list hydrates populated.
	const { data: versions, isPending } = useQuery({
		queryKey: INSTRUMENTS_LIST_QUERY_KEY,
		queryFn: () => playspaceApi.admin.instruments.list()
	});

	const allVersions = useMemo<InstrumentVersionRow[]>(
		() =>
			(versions ?? []).map(r => ({
				id: r.id,
				instrument_key: r.instrument_key,
				version: r.instrument_version,
				is_active: r.is_active,
				content: r.content as unknown as InstrumentContent,
				created_at: r.created_at,
				activated_at: r.updated_at
			})),
		[versions]
	);

	const activeVersion = useMemo(() => allVersions.find(v => v.is_active) ?? null, [allVersions]);

	const setInstrumentMutation = useMutation<unknown, Error, SetInstrumentVars>({
		mutationFn: (params: SetInstrumentVars) =>
			playspaceApi.admin.instruments.create(
				{
					instrument_key: activeVersion?.instrument_key || "pvua_v5_2",
					instrument_version: params.version,
					content: params.content
				},
				params.activate
			),
		onSuccess: async (_data, params) => {
			toast.success(t("toast.saveSuccess"), {
				description: params.activate
					? t("toast.saveActiveDesc", { version: params.version })
					: t("toast.saveDraftDesc", { version: params.version })
			});
			setEditingContent(null);
			// Await the refetch so the version list reflects the new draft/active
			// version before the editor closes back to the list — otherwise the
			// list stayed stale until a manual refresh.
			await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
		},
		onError: (error: Error) => {
			toast.error(t("toast.saveError"), {
				description: error.message
			});
		}
	});

	const activateVersionMutation = useMutation({
		mutationFn: (versionRow: InstrumentVersionRow) =>
			playspaceApi.admin.instruments.update(versionRow.id, { is_active: true }),
		onSuccess: async (_, versionRow) => {
			toast.success(t("toast.activateSuccess"), {
				description: t("toast.activateDesc", { version: versionRow.version })
			});
			setIsActivateDialogOpen(false);
			setVersionToActivate(null);
			await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
		},
		onError: (error: Error) => {
			toast.error(t("toast.activateError"), {
				description: error.message
			});
		}
	});

	async function handleSaveDraft(version: string, content: InstrumentContent, activate = false) {
		const result = await setInstrumentMutation.mutateAsync({
			version,
			content: content as InstrumentContentPayload,
			activate
		});
		return result;
	}

	function handleEditDraft(baseVersion: string, baseContent: InstrumentContent) {
		setEditingVersion(bumpVersion(baseVersion));
		setEditingContent(structuredClone(baseContent));
	}

	function handleUpload(version: string, content: InstrumentContent, activate: boolean) {
		setInstrumentMutation.mutate({ version, content: content as InstrumentContentPayload, activate });
		setIsUploadDialogOpen(false);
	}

	const isMutating = setInstrumentMutation.isPending || activateVersionMutation.isPending;

	const headerActions = !editingContent ? (
		<div className="flex items-center gap-2">
			<Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
				<FileUp className="mr-2 h-4 w-4" />
				{t("uploadAction")}
			</Button>
			{activeVersion && (
				<Button
					size="sm"
					onClick={() =>
						handleEditDraft(activeVersion.version, activeVersion.content as unknown as InstrumentContent)
					}>
					<Plus className="mr-2 h-4 w-4" />
					{t("createDraft")}
				</Button>
			)}
		</div>
	) : undefined;

	return (
		<div className="space-y-6">
			<DashboardHeader
				eyebrow={t("header.eyebrow")}
				title={t("title")}
				description={t("description")}
				breadcrumbs={[
					{ label: t("breadcrumbs.dashboard"), href: "/admin/dashboard" },
					{ label: t("breadcrumbs.instruments") }
				]}
				actions={headerActions}
			/>

			{isPending ? (
				<div className="flex h-48 items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : (
				<>
					{!editingContent && allVersions.length > 0 && (
						<VersionHistory
							versions={allVersions}
							isPending={isMutating}
							onActivateVersion={v => {
								setVersionToActivate(v);
								setIsActivateDialogOpen(true);
							}}
							onEditDraft={handleEditDraft}
						/>
					)}

					{editingContent ? (
						<InstrumentEditor
							content={editingContent}
							version={editingVersion}
							isPending={isMutating}
							onSave={handleSaveDraft}
							onCancel={() => setEditingContent(null)}
						/>
					) : (
						allVersions.length === 0 && (
							<EmptyState
								title={t("empty.title")}
								description={t("empty.description")}
								action={
									<Button onClick={() => setIsUploadDialogOpen(true)}>{t("empty.action")}</Button>
								}
							/>
						)
					)}
				</>
			)}

			<ActivateDialog
				open={isActivateDialogOpen}
				isPending={isMutating}
				onConfirm={() => {
					if (versionToActivate) activateVersionMutation.mutate(versionToActivate);
				}}
				onCancel={() => {
					setIsActivateDialogOpen(false);
					setVersionToActivate(null);
				}}
			/>

			<UploadDialog
				open={isUploadDialogOpen}
				isPending={isMutating}
				onUpload={handleUpload}
				onClose={() => setIsUploadDialogOpen(false)}
			/>
		</div>
	);
}
