"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

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
import { playspaceApi } from "@/lib/api/playspace";

export interface InviteManagerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called with the invited email address after a successful invitation. */
	onSuccess?: (email: string) => void;
}

/**
 * Validate a basic email format without relying on browser-native type="email".
 */
function isValidEmailFormat(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Modal dialog for inviting a secondary manager to the current workspace.
 * Handles the full invite flow: input, validation, submission, and error feedback.
 * On success the manager-invites query cache is invalidated so the pending
 * invites list refreshes without a manual page reload.
 */
export function InviteManagerDialog({ open, onOpenChange, onSuccess }: Readonly<InviteManagerDialogProps>) {
	const t = useTranslations("settings.managerContacts.inviteDialog");
	const queryClient = useQueryClient();

	const [email, setEmail] = React.useState("");
	const [validationError, setValidationError] = React.useState<string | null>(null);

	const inviteMutation = useMutation({
		mutationFn: () => playspaceApi.managerInvites.create(email.trim()),
		onSuccess: async data => {
			await queryClient.invalidateQueries({ queryKey: ["auth", "managerInvites"] });
			onSuccess?.(data.email);
			handleReset();
			onOpenChange(false);
		},
		onError: (error: Error) => {
			setValidationError(error.message.trim().length > 0 ? error.message : t("errors.generic"));
		}
	});

	function handleReset() {
		setEmail("");
		setValidationError(null);
		inviteMutation.reset();
	}

	function handleOpenChange(next: boolean) {
		if (!next) {
			handleReset();
		}

		onOpenChange(next);
	}

	function handleEmailChange(value: string) {
		setEmail(value);
		if (validationError !== null) {
			setValidationError(null);
		}
	}

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmed = email.trim();

		if (trimmed.length === 0) {
			setValidationError(t("errors.emailRequired"));
			return;
		}

		if (!isValidEmailFormat(trimmed)) {
			setValidationError(t("errors.emailInvalid"));
			return;
		}

		setValidationError(null);
		inviteMutation.mutate();
	}

	const isPending = inviteMutation.isPending;
	const hasError = validationError !== null;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4" noValidate>
					<div className="space-y-2">
						<Label htmlFor="invite_manager_email">
							{t("emailLabel")}{" "}
							<span className="text-destructive" aria-hidden="true">
								*
							</span>
						</Label>

						<div className="relative">
							<Mail
								className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
							<Input
								id="invite_manager_email"
								name="inviteEmail"
								type="email"
								autoComplete="email"
								spellCheck={false}
								placeholder={t("emailPlaceholder")}
								value={email}
								onChange={event => handleEmailChange(event.target.value)}
								className="pl-9"
								aria-required="true"
								aria-invalid={hasError}
								aria-describedby={hasError ? "invite_email_error" : undefined}
								disabled={isPending}
								autoFocus
							/>
						</div>

						{hasError ? (
							<p
								id="invite_email_error"
								role="alert"
								aria-live="polite"
								className="text-sm text-destructive">
								{validationError}
							</p>
						) : null}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={isPending}>
							{t("cancelButton")}
						</Button>
						<Button type="submit" disabled={isPending || email.trim().length === 0} aria-busy={isPending}>
							{isPending ? t("sendingButton") : t("sendButton")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
