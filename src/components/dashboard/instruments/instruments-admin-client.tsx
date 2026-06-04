"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Plus } from "lucide-react";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";

import { playspaceApi } from "@/lib/api/playspace";
import { instrumentContentSchema } from "@/lib/api/playspace-types";
import type { z } from "zod";

import type { InstrumentContent, InstrumentVersionRow } from "./types";
import { INSTRUMENTS_LIST_QUERY_KEY } from "./constants";
import { suggestNextDraftVersion, suggestNextPublishedVersion } from "./utils";
import { VersionHistory } from "./version-history";
import { InstrumentEditor } from "./instrument-editor";
import { ActivateDialog } from "./activate-dialog";
import { UploadDialog } from "./upload-dialog";

type InstrumentContentPayload = z.infer<typeof instrumentContentSchema>;

type SetInstrumentVars = {
	version: string;
	content: InstrumentContentPayload;
	activate?: boolean;
	parentInstrumentId?: string | null;
};

export function InstrumentsAdminClient() {
	const t = useTranslations("admin.instruments");
	const queryClient = useQueryClient();

	const [editingContent, setEditingContent] = useState<InstrumentContent | null>(null);
	const [editingVersion, setEditingVersion] = useState<string>("");
	const [editingParentInstrumentId, setEditingParentInstrumentId] = useState<string | null>(null);
	const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
	const [versionToActivate, setVersionToActivate] = useState<InstrumentVersionRow | null>(null);
	const [versionToDelete, setVersionToDelete] = useState<InstrumentVersionRow | null>(null);
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

	// Single source of truth: the full list and the active version both derive from
	// this one query, avoiding a two-query race (empty-state flash, stale UI). The
	// server component prefetches this key, so the list hydrates already populated.
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
				parent_instrument_id: r.parent_instrument_id,
				is_active: r.is_active,
				content: r.content as unknown as InstrumentContent,
				created_at: r.created_at,
				activated_at: r.updated_at,
				submission_count: r.submission_count,
				can_delete: r.can_delete
			})),
		[versions]
	);

	const activeVersion = useMemo(() => allVersions.find(v => v.is_active) ?? null, [allVersions]);

	// Publication numbers derive from the root (non-draft) rows only — never from drafts.
	const publishedVersions = useMemo(
		() => allVersions.filter(v => v.parent_instrument_id === null).map(v => v.version),
		[allVersions]
	);

	// Draft branches orphaned if the version queued for deletion is removed (drives the warning copy).
	const versionToDeleteChildren = useMemo(
		() => (versionToDelete ? allVersions.filter(v => v.parent_instrument_id === versionToDelete.id) : []),
		[versionToDelete, allVersions]
	);

	async function refreshVersionHistory() {
		await queryClient.refetchQueries({
			queryKey: INSTRUMENTS_LIST_QUERY_KEY,
			exact: true,
			type: "active"
		});
	}

	const setInstrumentMutation = useMutation<
		Awaited<ReturnType<typeof playspaceApi.admin.instruments.create>>,
		Error,
		SetInstrumentVars
	>({
		mutationFn: (params: SetInstrumentVars) =>
			playspaceApi.admin.instruments.create(
				{
					instrument_key: activeVersion?.instrument_key || "pvua_v5_2",
					instrument_version: params.version,
					parent_instrument_id: params.parentInstrumentId ?? null,
					content: params.content
				},
				params.activate
			),
		onSuccess: async (data, params) => {
			const savedVersion = data.instrument_version;
			toast.success(t("toast.saveSuccess"), {
				description: params.activate
					? t("toast.saveActiveDesc", { version: savedVersion })
					: t("toast.saveDraftDesc", { version: savedVersion })
			});
			setEditingContent(null);
			setEditingParentInstrumentId(null);
			await refreshVersionHistory();
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
		onSuccess: async updated => {
			toast.success(t("toast.activateSuccess"), {
				description: t("toast.activateDesc", {
					version: updated.instrument_version
				})
			});
			setIsActivateDialogOpen(false);
			setVersionToActivate(null);
			await refreshVersionHistory();
		},
		onError: (error: Error) => {
			toast.error(t("toast.activateError"), {
				description: error.message
			});
		}
	});

	const deleteVersionMutation = useMutation({
		mutationFn: (versionRow: InstrumentVersionRow) => playspaceApi.admin.instruments.delete(versionRow.id),
		onSuccess: async (_, versionRow) => {
			toast.success(t("toast.deleteSuccess"), {
				description: t("toast.deleteDesc", { version: versionRow.version })
			});
			setVersionToDelete(null);
			await refreshVersionHistory();
		},
		onError: (error: Error) => {
			toast.error(t("toast.deleteError"), {
				description: error.message
			});
		}
	});

	async function handleSaveDraft(version: string, content: InstrumentContent, activate = false) {
		const result = await setInstrumentMutation.mutateAsync({
			version,
			content: content as InstrumentContentPayload,
			activate,
			parentInstrumentId: editingParentInstrumentId
		});
		return result;
	}

	function handleEditDraft(baseVersion: string, baseContent: InstrumentContent, parentInstrumentId: string) {
		const existingVersions = allVersions.map(versionRow => versionRow.version);
		setEditingVersion(suggestNextDraftVersion(baseVersion, existingVersions));
		setEditingParentInstrumentId(parentInstrumentId);
		setEditingContent(structuredClone(baseContent));
	}

	function handleUpload(version: string, content: InstrumentContent, activate: boolean) {
		setInstrumentMutation.mutate({
			version,
			content: content as InstrumentContentPayload,
			activate,
			parentInstrumentId: null
		});
		setIsUploadDialogOpen(false);
	}

	const isMutating =
		setInstrumentMutation.isPending || activateVersionMutation.isPending || deleteVersionMutation.isPending;

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
						handleEditDraft(
							activeVersion.version,
							activeVersion.content as unknown as InstrumentContent,
							activeVersion.id
						)
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
							activeVersion={activeVersion?.version ?? null}
							isPending={isMutating}
							onActivateVersion={v => {
								setVersionToActivate(v);
								setIsActivateDialogOpen(true);
							}}
							onEditDraft={handleEditDraft}
							onDeleteVersion={setVersionToDelete}
						/>
					)}

					{editingContent ? (
						<InstrumentEditor
							content={editingContent}
							version={editingVersion}
							lockVersion={true}
							isPending={isMutating}
							onSave={handleSaveDraft}
							onCancel={() => {
								setEditingContent(null);
								setEditingParentInstrumentId(null);
							}}
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
				versionLabel={versionToActivate?.version ?? null}
				nextPublishedVersion={
					// Only a draft gets a fresh publication number on activation.
					// Reactivating an existing publication (a rollback) keeps its number.
					versionToActivate?.parent_instrument_id && publishedVersions.length > 0
						? suggestNextPublishedVersion(publishedVersions)
						: null
				}
				onConfirm={() => {
					if (versionToActivate) activateVersionMutation.mutate(versionToActivate);
				}}
				onCancel={() => {
					setIsActivateDialogOpen(false);
					setVersionToActivate(null);
				}}
			/>

			<ConfirmDialog
				open={versionToDelete !== null}
				onOpenChange={open => {
					if (!open) {
						setVersionToDelete(null);
					}
				}}
				title={
					versionToDelete
						? t("versionHistory.confirmDeleteTitleNamed", { version: versionToDelete.version })
						: t("versionHistory.confirmDeleteTitle")
				}
				description={(() => {
					if (!versionToDelete) {
						return t("versionHistory.confirmDeleteGeneric");
					}
					const base = versionToDelete.parent_instrument_id
						? t("versionHistory.confirmDeleteDraft", { version: versionToDelete.version })
						: t("versionHistory.confirmDeleteInactive", { version: versionToDelete.version });
					if (versionToDeleteChildren.length === 0) {
						return base;
					}
					return `${base} ${t("versionHistory.confirmDeleteBranchWarning", {
						count: versionToDeleteChildren.length,
						versions: versionToDeleteChildren.map(child => `v${child.version}`).join(", ")
					})}`;
				})()}
				confirmLabel={t("versionHistory.deletePermanently")}
				isPending={deleteVersionMutation.isPending}
				onConfirm={() => {
					if (versionToDelete) {
						deleteVersionMutation.mutate(versionToDelete);
					}
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
