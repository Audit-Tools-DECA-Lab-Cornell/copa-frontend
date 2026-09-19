"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { AccountDeletionLedger } from "@/components/dashboard/account-deletion/account-deletion-ledger";
import { DeleteAccountDialog } from "@/components/dashboard/account-deletion/delete-account-dialog";
import { PrimaryTransferDialog } from "@/components/dashboard/account-deletion/primary-transfer-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountDeletionBlocker, AccountDeletionPreview, ManagerProfile } from "@/lib/api/playspace";
import { playspaceApi } from "@/lib/api/playspace";
import type { AuthSession } from "@/lib/auth/session";

export const ACCOUNT_DELETION_QUERY_KEY = ["playspace", "settings", "accountDeletion"] as const;

/**
 * Guidance copy for each reason the backend can refuse a deletion. The reason
 * codes themselves are internal and never reach the screen.
 */
const BLOCKER_COPY_KEYS = {
	PRIMARY_MANAGER_TRANSFER_REQUIRED: "primaryManagerTransferRequired",
	PENDING_SUBMISSION_DELIVERY: "pendingSubmissionDelivery",
	PERSONAL_ACCOUNT_HAS_DEPENDENCIES: "personalAccountHasDependencies"
} as const satisfies Record<AccountDeletionBlocker, string>;

export interface AccountDeletionCardProps {
	session: AuthSession;
	/** Organisation name for managers; auditors pass null and get generic wording. */
	organizationName: string | null;
	managerProfiles: readonly ManagerProfile[];
	managerProfilesIsLoading: boolean;
}

/**
 * Pick the managers who can take over as main contact: same organisation,
 * not already the main contact, and not the reader themselves.
 */
function getEligibleSuccessors(
	managerProfiles: readonly ManagerProfile[],
	session: AuthSession
): readonly ManagerProfile[] {
	const ownEmail = session.userEmail?.trim().toLowerCase() ?? "";

	return managerProfiles.filter(profile => !profile.is_primary && profile.email.trim().toLowerCase() !== ownEmail);
}

function AccountDeletionCardShell({ children }: Readonly<{ children: React.ReactNode }>) {
	const t = useTranslations("settings.deleteAccount");

	return (
		<Card className="border-destructive/40">
			<CardHeader>
				<p className="text-xs font-semibold tracking-[0.08em] text-destructive uppercase">{t("eyebrow")}</p>
				<CardTitle>{t("title")}</CardTitle>
				<CardDescription>{t("description")}</CardDescription>
				<CardAction>
					<Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
				</CardAction>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
	);
}

/**
 * Plain-language explanation of what still stands between the reader and a
 * deleted account, plus the one action that clears it.
 */
function BlockerNotice({
	blocker,
	preview,
	organizationName,
	onChooseSuccessor,
	onRecheck,
	isRechecking
}: Readonly<{
	blocker: AccountDeletionBlocker | null;
	preview: AccountDeletionPreview;
	organizationName: string | null;
	onChooseSuccessor: () => void;
	onRecheck: () => void;
	isRechecking: boolean;
}>) {
	const t = useTranslations("settings.deleteAccount.blockers");
	const copyKey = blocker === null ? null : BLOCKER_COPY_KEYS[blocker];

	const body = (() => {
		if (copyKey === "primaryManagerTransferRequired") {
			return organizationName
				? t("primaryManagerTransferRequired.body", { organization: organizationName })
				: t("primaryManagerTransferRequired.bodyGeneric");
		}

		if (copyKey === "pendingSubmissionDelivery") {
			return t("pendingSubmissionDelivery.body", { count: preview.pending_submissions });
		}

		if (copyKey === "personalAccountHasDependencies") {
			return t("personalAccountHasDependencies.body");
		}

		return t("generic.body");
	})();

	const isTransferBlocker = copyKey === "primaryManagerTransferRequired";

	return (
		<div className="rounded-card border border-status-warning-border bg-status-warning-surface p-4">
			<p className="flex items-center gap-2 text-sm font-semibold text-foreground">
				<AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" aria-hidden="true" />
				{t("title")}
			</p>
			<p className="mt-2 text-sm leading-6 text-foreground">{body}</p>
			<div className="mt-3">
				{isTransferBlocker ? (
					<Button type="button" variant="outline" size="sm" onClick={onChooseSuccessor}>
						{t("primaryManagerTransferRequired.action")}
					</Button>
				) : (
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={isRechecking}
						aria-busy={isRechecking}
						onClick={onRecheck}>
						{t("recheck")}
					</Button>
				)}
			</div>
		</div>
	);
}

/**
 * Danger-zone panel on the settings page for managers and auditors.
 *
 * Reads the impact summary first, so the reader always sees what deleting
 * their account keeps and removes before any confirmation step opens.
 * Administrators never see this panel and must not render it.
 */
export function AccountDeletionCard({
	session,
	organizationName,
	managerProfiles,
	managerProfilesIsLoading
}: Readonly<AccountDeletionCardProps>) {
	const t = useTranslations("settings.deleteAccount");

	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
	const [isTransferDialogOpen, setIsTransferDialogOpen] = React.useState(false);
	const [transferSuccessMessage, setTransferSuccessMessage] = React.useState<string | null>(null);

	const previewQuery = useQuery({
		queryKey: ACCOUNT_DELETION_QUERY_KEY,
		queryFn: () => playspaceApi.accountDeletion.preview()
	});

	const preview = previewQuery.data ?? null;
	const eligibleSuccessors = getEligibleSuccessors(managerProfiles, session);

	function handleRefreshPreview() {
		void previewQuery.refetch();
	}

	if (previewQuery.isLoading) {
		return (
			<AccountDeletionCardShell>
				<div className="grid gap-3 md:grid-cols-2">
					<Skeleton className="h-28 rounded-card" />
					<Skeleton className="h-28 rounded-card" />
				</div>
				<Skeleton className="h-9 w-48 rounded-field" />
			</AccountDeletionCardShell>
		);
	}

	if (preview === null) {
		return (
			<AccountDeletionCardShell>
				<div className="rounded-card border border-edge/40 bg-secondary/40 p-4">
					<p className="text-sm font-semibold text-foreground">{t("loadError.title")}</p>
					<p className="mt-2 text-sm leading-6 text-muted-foreground">{t("loadError.body")}</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={previewQuery.isFetching}
					aria-busy={previewQuery.isFetching}
					onClick={handleRefreshPreview}>
					{t("loadError.retry")}
				</Button>
			</AccountDeletionCardShell>
		);
	}

	return (
		<>
			<AccountDeletionCardShell>
				<AccountDeletionLedger preview={preview} organizationName={organizationName} />

				{preview.can_delete ? null : (
					<BlockerNotice
						blocker={preview.blocker}
						preview={preview}
						organizationName={organizationName}
						onChooseSuccessor={() => {
							setTransferSuccessMessage(null);
							setIsTransferDialogOpen(true);
						}}
						onRecheck={handleRefreshPreview}
						isRechecking={previewQuery.isFetching}
					/>
				)}

				{transferSuccessMessage ? (
					<p aria-live="polite" className="text-sm text-status-success">
						{transferSuccessMessage}
					</p>
				) : null}

				<div className="flex justify-start">
					<Button
						type="button"
						variant="destructive"
						disabled={!preview.can_delete}
						data-testid="delete-account-open"
						onClick={() => setIsDeleteDialogOpen(true)}>
						<Trash2 className="h-4 w-4" aria-hidden="true" />
						{t("actions.start")}
					</Button>
				</div>
			</AccountDeletionCardShell>

			{preview.can_delete ? (
				<DeleteAccountDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					preview={preview}
					organizationName={organizationName}
					onRefreshPreview={handleRefreshPreview}
				/>
			) : null}

			{preview.is_primary_manager ? (
				<PrimaryTransferDialog
					open={isTransferDialogOpen}
					onOpenChange={setIsTransferDialogOpen}
					successors={eligibleSuccessors}
					isLoadingSuccessors={managerProfilesIsLoading}
					organizationName={organizationName}
					onTransferred={successorName => {
						setTransferSuccessMessage(t("transferSuccess", { name: successorName }));
						handleRefreshPreview();
					}}
				/>
			) : null}
		</>
	);
}
