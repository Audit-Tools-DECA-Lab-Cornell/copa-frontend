"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";

import { getValidationMessage, getZodFieldErrors } from "./tanstack-form-utils";
import { toNullableInteger, toNullableString } from "./form-utils";

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const projectDialogSchema = z
	.object({
		name: z.string().trim().min(1, "Project name is required."),
		overview: z.string(),
		startDate: z.string(),
		endDate: z.string(),
		estimatedPlaces: z
			.string()
			.refine(
				value => value.trim().length === 0 || WHOLE_NUMBER_PATTERN.test(value),
				"Estimated places must be a whole number."
			),
		estimatedAuditors: z
			.string()
			.refine(
				value => value.trim().length === 0 || WHOLE_NUMBER_PATTERN.test(value),
				"Estimated auditors must be a whole number."
			),
		auditorDescription: z.string()
	})
	.superRefine((values, context) => {
		if (values.startDate && values.endDate && values.startDate > values.endDate) {
			context.addIssue({
				code: "custom",
				path: ["endDate"],
				message: "End date must be on or after the start date."
			});
		}
	});

type ProjectDialogFormValues = z.infer<typeof projectDialogSchema>;

export interface ProjectDialogInitialValues {
	name?: string;
	overview?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	estimatedPlaces?: number | null;
	estimatedAuditors?: number | null;
	auditorDescription?: string | null;
}

export interface ProjectDialogPayload {
	name: string;
	overview: string | null;
	start_date: string | null;
	end_date: string | null;
	est_places: number | null;
	est_auditors: number | null;
	auditor_description: string | null;
}

export interface ProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	submitLabel: string;
	initialValues?: ProjectDialogInitialValues;
	isPending?: boolean;
	onSubmit: (payload: ProjectDialogPayload) => Promise<void>;
}

/**
 * Convert schema issues into TanStack Form field error strings.
 */
function validateProjectValues(
	values: ProjectDialogFormValues
): Partial<Record<keyof ProjectDialogFormValues, string>> | undefined {
	const parsedValues = projectDialogSchema.safeParse(values);
	if (parsedValues.success) {
		return undefined;
	}

	return getZodFieldErrors<keyof ProjectDialogFormValues>(parsedValues.error.issues);
}

function getDefaultValues(initialValues?: ProjectDialogInitialValues): ProjectDialogFormValues {
	return {
		name: initialValues?.name ?? "",
		overview: initialValues?.overview ?? "",
		startDate: initialValues?.startDate ?? "",
		endDate: initialValues?.endDate ?? "",
		estimatedPlaces:
			initialValues?.estimatedPlaces === null || initialValues?.estimatedPlaces === undefined
				? ""
				: String(initialValues.estimatedPlaces),
		estimatedAuditors:
			initialValues?.estimatedAuditors === null || initialValues?.estimatedAuditors === undefined
				? ""
				: String(initialValues.estimatedAuditors),
		auditorDescription: initialValues?.auditorDescription ?? ""
	};
}

/**
 * Shared project create/edit dialog with zod validation and enterprise field grouping.
 */
export function ProjectDialog({
	open,
	onOpenChange,
	title,
	description,
	submitLabel,
	initialValues,
	isPending = false,
	onSubmit
}: Readonly<ProjectDialogProps>) {
	const [submitError, setSubmitError] = React.useState<string | null>(null);
	const initialName = initialValues?.name ?? "";
	const initialOverview = initialValues?.overview ?? "";
	const initialStartDate = initialValues?.startDate ?? "";
	const initialEndDate = initialValues?.endDate ?? "";
	const initialEstimatedPlaces = initialValues?.estimatedPlaces ?? null;
	const initialEstimatedAuditors = initialValues?.estimatedAuditors ?? null;
	const initialAuditorDescription = initialValues?.auditorDescription ?? "";
	const defaultValues = React.useMemo(
		() =>
			getDefaultValues({
				name: initialName,
				overview: initialOverview,
				startDate: initialStartDate,
				endDate: initialEndDate,
				estimatedPlaces: initialEstimatedPlaces,
				estimatedAuditors: initialEstimatedAuditors,
				auditorDescription: initialAuditorDescription
			}),
		[
			initialAuditorDescription,
			initialEndDate,
			initialEstimatedAuditors,
			initialEstimatedPlaces,
			initialName,
			initialOverview,
			initialStartDate
		]
	);
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: ({ value }) => validateProjectValues(value)
		},
		onSubmit: async ({ value }) => {
			try {
				setSubmitError(null);
				await onSubmit({
					name: value.name.trim(),
					overview: toNullableString(value.overview),
					start_date: toNullableString(value.startDate),
					end_date: toNullableString(value.endDate),
					est_places: toNullableInteger(value.estimatedPlaces),
					est_auditors: toNullableInteger(value.estimatedAuditors),
					auditor_description: toNullableString(value.auditorDescription)
				});
				onOpenChange(false);
			} catch (error) {
				setSubmitError(error instanceof Error ? error.message : "Unable to save project.");
			}
		}
	});

	const [prevOpen, setPrevOpen] = React.useState(open);
	const [prevDefaultValues, setPrevDefaultValues] = React.useState(defaultValues);

	if (open !== prevOpen || defaultValues !== prevDefaultValues) {
		setPrevOpen(open);
		setPrevDefaultValues(defaultValues);
		if (open) {
			form.reset(defaultValues);
			setSubmitError(null);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<form
					className="space-y-5"
					onSubmit={async event => {
						event.preventDefault();
						event.stopPropagation();
						await form.handleSubmit();
					}}>
					<p className="text-xs text-muted-foreground">
						Fields marked with{" "}
						<span className="text-destructive" aria-hidden="true">
							*
						</span>{" "}
						are required.
					</p>
					<div className="grid gap-4 md:grid-cols-2">
						<form.Field name="name">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);

								return (
									<div className="grid gap-2 md:col-span-2">
										<Label htmlFor={field.name}>
											Project name{" "}
											<span className="text-destructive" aria-hidden="true">
												*
											</span>
										</Label>
										<Input
											id={field.name}
											placeholder="e.g. Summer 2026 Playspace Audit"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											aria-invalid={Boolean(validationMessage)}
											aria-required="true"
										/>
										{validationMessage ? (
											<p className="text-sm text-destructive">{validationMessage}</p>
										) : null}
									</div>
								);
							}}
						</form.Field>
						<form.Field name="overview">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>
										Overview{" "}
										<span className="text-xs font-normal text-muted-foreground">(optional)</span>
									</Label>
									<Textarea
										id={field.name}
										placeholder="A brief description of the project's goals and scope…"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => field.handleChange(event.target.value)}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="startDate">
							{field => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>
										Start date{" "}
										<span className="text-xs font-normal text-muted-foreground">(optional)</span>
									</Label>
									<Input
										id={field.name}
										type="date"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => field.handleChange(event.target.value)}
									/>
								</div>
							)}
						</form.Field>
						<form.Field name="endDate">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);

								return (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											End date{" "}
											<span className="text-xs font-normal text-muted-foreground">
												(optional)
											</span>
										</Label>
										<Input
											id={field.name}
											type="date"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											aria-invalid={Boolean(validationMessage)}
										/>
										{validationMessage ? (
											<p className="text-sm text-destructive">{validationMessage}</p>
										) : null}
									</div>
								);
							}}
						</form.Field>
						<form.Field name="estimatedPlaces">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);

								return (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											Estimated places{" "}
											<span className="text-xs font-normal text-muted-foreground">
												(optional)
											</span>
										</Label>
										<Input
											id={field.name}
											inputMode="numeric"
											placeholder="e.g. 20"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											aria-invalid={Boolean(validationMessage)}
										/>
										{validationMessage ? (
											<p className="text-sm text-destructive">{validationMessage}</p>
										) : (
											<p className="text-xs text-muted-foreground">
												Total number of places you plan to include.
											</p>
										)}
									</div>
								);
							}}
						</form.Field>
						<form.Field name="estimatedAuditors">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);

								return (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>
											Estimated auditors{" "}
											<span className="text-xs font-normal text-muted-foreground">
												(optional)
											</span>
										</Label>
										<Input
											id={field.name}
											inputMode="numeric"
											placeholder="e.g. 5"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											aria-invalid={Boolean(validationMessage)}
										/>
										{validationMessage ? (
											<p className="text-sm text-destructive">{validationMessage}</p>
										) : (
											<p className="text-xs text-muted-foreground">
												Number of auditors expected to work on this project.
											</p>
										)}
									</div>
								);
							}}
						</form.Field>
						<form.Field name="auditorDescription">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>
										Auditor guidance{" "}
										<span className="text-xs font-normal text-muted-foreground">(optional)</span>
									</Label>
									<Textarea
										id={field.name}
										placeholder="Provide any site-specific instructions, access details, or scoring priorities for your auditors…"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => field.handleChange(event.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										Auditors will see this guidance in the mobile app before starting an audit.
									</p>
								</div>
							)}
						</form.Field>
					</div>
					{submitError ? (
						<p aria-live="polite" className="text-sm text-destructive">
							{submitError}
						</p>
					) : null}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
