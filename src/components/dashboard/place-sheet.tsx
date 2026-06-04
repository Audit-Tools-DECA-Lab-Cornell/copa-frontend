"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { Loader2, MapPinned } from "lucide-react";
import Image from "next/image";
import { z } from "zod";

import type { PlayspaceType } from "@/lib/api/playspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { toNullableInteger, toNullableNumber, toNullableString } from "./form-utils";
import { getValidationMessage, getZodFieldErrors } from "./tanstack-form-utils";

const WHOLE_NUMBER_PATTERN = /^\d+$/;

const PLACE_TYPE_OPTIONS: readonly PlayspaceType[] = [
	"Public Playspace",
	"Pre-School Playspace",
	"Destination Playspace",
	"Nature Playspace",
	"Neighborhood Playspace",
	"Waterfront Playspace",
	"School Playspace"
];

interface AddressSuggestion {
	address: string;
	city: string | null;
	country: string | null;
	formattedAddress: string;
	lat: number;
	lng: number;
	postalCode: string | null;
	province: string | null;
}

const placeSheetSchema = z
	.object({
		name: z.string().trim().min(1, "Place name is required."),
		address: z.string(),
		city: z.string(),
		province: z.string(),
		country: z.string(),
		postalCode: z.string(),
		placeType: z.string(),
		latitude: z
			.string()
			.refine(
				value => value.trim().length === 0 || !Number.isNaN(Number(value)),
				"Latitude must be a valid number."
			),
		longitude: z
			.string()
			.refine(
				value => value.trim().length === 0 || !Number.isNaN(Number(value)),
				"Longitude must be a valid number."
			),
		startDate: z.string(),
		endDate: z.string(),
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

type PlaceSheetFormValues = z.infer<typeof placeSheetSchema>;

export interface PlaceSheetInitialValues {
	name?: string;
	address?: string | null;
	city?: string | null;
	province?: string | null;
	country?: string | null;
	postalCode?: string | null;
	placeType?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	startDate?: string | null;
	endDate?: string | null;
	estimatedAuditors?: number | null;
	auditorDescription?: string | null;
}

export interface PlaceSheetPayload {
	name: string;
	address: string | null;
	city: string | null;
	province: string | null;
	country: string | null;
	postal_code: string | null;
	place_type: string | null;
	lat: number | null;
	lng: number | null;
	start_date: string | null;
	end_date: string | null;
	est_auditors: number | null;
	auditor_description: string | null;
}

export interface PlaceSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	submitLabel: string;
	initialValues?: PlaceSheetInitialValues;
	isPending?: boolean;
	onSubmit: (payload: PlaceSheetPayload) => Promise<void>;
}

/**
 * Convert zod issues into TanStack Form field errors.
 */
function validatePlaceValues(
	values: PlaceSheetFormValues
): Partial<Record<keyof PlaceSheetFormValues, string>> | undefined {
	const parsedValues = placeSheetSchema.safeParse(values);
	if (parsedValues.success) {
		return undefined;
	}
	return getZodFieldErrors<keyof PlaceSheetFormValues>(parsedValues.error.issues);
}

function getDefaultValues(initialValues?: PlaceSheetInitialValues): PlaceSheetFormValues {
	return {
		name: initialValues?.name ?? "",
		address: initialValues?.address ?? "",
		city: initialValues?.city ?? "",
		province: initialValues?.province ?? "",
		country: initialValues?.country ?? "",
		postalCode: initialValues?.postalCode ?? "",
		placeType: initialValues?.placeType ?? "",
		latitude:
			initialValues?.latitude === null || initialValues?.latitude === undefined
				? ""
				: String(initialValues.latitude),
		longitude:
			initialValues?.longitude === null || initialValues?.longitude === undefined
				? ""
				: String(initialValues.longitude),
		startDate: initialValues?.startDate ?? "",
		endDate: initialValues?.endDate ?? "",
		estimatedAuditors:
			initialValues?.estimatedAuditors === null || initialValues?.estimatedAuditors === undefined
				? ""
				: String(initialValues.estimatedAuditors),
		auditorDescription: initialValues?.auditorDescription ?? ""
	};
}

/**
 * Build an internal static-map proxy URL centered on the given coordinates.
 */
function buildStaticMapUrl(lat: string, lng: string): string | null {
	const latNum = Number(lat.trim());
	const lngNum = Number(lng.trim());
	if (lat.trim().length === 0 || lng.trim().length === 0) return null;
	if (Number.isNaN(latNum) || Number.isNaN(lngNum)) return null;
	const params = new URLSearchParams({
		height: "220",
		lat: String(latNum),
		lng: String(lngNum),
		scale: "2",
		width: "600",
		zoom: "15"
	});
	return `/api/google-maps/static-map?${params.toString()}`;
}

export function PlaceSheet({
	open,
	onOpenChange,
	title,
	description,
	submitLabel,
	initialValues,
	isPending = false,
	onSubmit
}: Readonly<PlaceSheetProps>) {
	const [submitError, setSubmitError] = React.useState<string | null>(null);
	const [addressLookupError, setAddressLookupError] = React.useState<string | null>(null);
	const [addressSearchTerm, setAddressSearchTerm] = React.useState(initialValues?.address ?? "");
	const [addressSuggestions, setAddressSuggestions] = React.useState<AddressSuggestion[]>([]);
	const [isAddressDropdownOpen, setIsAddressDropdownOpen] = React.useState(false);
	const [isSearchingAddresses, setIsSearchingAddresses] = React.useState(false);
	const applyingSuggestionRef = React.useRef(false);

	const defaultValues = React.useMemo(() => getDefaultValues(initialValues), [initialValues]);

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: ({ value }) => validatePlaceValues(value)
		},
		onSubmit: async ({ value }) => {
			try {
				setSubmitError(null);
				await onSubmit({
					name: value.name.trim(),
					address: toNullableString(value.address),
					city: toNullableString(value.city),
					province: toNullableString(value.province),
					country: toNullableString(value.country),
					postal_code: toNullableString(value.postalCode),
					place_type: toNullableString(value.placeType),
					lat: toNullableNumber(value.latitude),
					lng: toNullableNumber(value.longitude),
					start_date: toNullableString(value.startDate),
					end_date: toNullableString(value.endDate),
					est_auditors: toNullableInteger(value.estimatedAuditors),
					auditor_description: toNullableString(value.auditorDescription)
				});
				onOpenChange(false);
			} catch (error) {
				setSubmitError(error instanceof Error ? error.message : "Unable to save place.");
			}
		}
	});

	const clearHiddenCoordinates = React.useCallback(() => {
		form.setFieldValue("latitude", "");
		form.setFieldValue("longitude", "");
	}, [form]);

	const [prevOpen, setPrevOpen] = React.useState(open);
	const [prevDefaultValues, setPrevDefaultValues] = React.useState(defaultValues);

	if (open !== prevOpen || defaultValues !== prevDefaultValues) {
		setPrevOpen(open);
		setPrevDefaultValues(defaultValues);
		if (open) {
			form.reset(defaultValues);
			setSubmitError(null);
			setAddressLookupError(null);
			setAddressSearchTerm(defaultValues.address);
			setAddressSuggestions([]);
			setIsAddressDropdownOpen(false);
		}
	}

	const handleAddressFieldEdit = React.useCallback(
		(fieldName: "address" | "city" | "province" | "country" | "postalCode", value: string) => {
			form.setFieldValue(fieldName, value);
			if (fieldName === "address") {
				setAddressSearchTerm(value);
				setIsAddressDropdownOpen(true);
			}
			if (applyingSuggestionRef.current) {
				return;
			}
			setAddressLookupError(null);
			clearHiddenCoordinates();
		},
		[clearHiddenCoordinates, form]
	);

	const applyAddressSuggestion = React.useCallback(
		(suggestion: AddressSuggestion) => {
			applyingSuggestionRef.current = true;
			form.setFieldValue("address", suggestion.address);
			form.setFieldValue("city", suggestion.city ?? "");
			form.setFieldValue("province", suggestion.province ?? "");
			form.setFieldValue("country", suggestion.country ?? "");
			form.setFieldValue("postalCode", suggestion.postalCode ?? "");
			form.setFieldValue("latitude", String(suggestion.lat));
			form.setFieldValue("longitude", String(suggestion.lng));
			setAddressSearchTerm(suggestion.address);
			setAddressSuggestions([]);
			setIsAddressDropdownOpen(false);
			setAddressLookupError(null);
			globalThis.setTimeout(() => {
				applyingSuggestionRef.current = false;
			}, 0);
		},
		[form]
	);

	const [prevAddressSearchTerm, setPrevAddressSearchTerm] = React.useState(addressSearchTerm);
	const [prevOpenForSearch, setPrevOpenForSearch] = React.useState(open);

	if (open !== prevOpenForSearch || addressSearchTerm !== prevAddressSearchTerm) {
		setPrevOpenForSearch(open);
		setPrevAddressSearchTerm(addressSearchTerm);
		if (!open || addressSearchTerm.trim().length < 3) {
			setAddressSuggestions([]);
			setIsSearchingAddresses(false);
		}
	}

	React.useEffect(() => {
		if (!open || addressSearchTerm.trim().length < 3) {
			return;
		}

		const controller = new AbortController();
		const timeoutId = globalThis.setTimeout(async () => {
			setIsSearchingAddresses(true);
			setAddressLookupError(null);
			try {
				const biasParts = [
					form.getFieldValue("city"),
					form.getFieldValue("province"),
					form.getFieldValue("country"),
					form.getFieldValue("postalCode")
				].filter((value): value is string => value.trim().length > 0);
				const searchQuery = [addressSearchTerm.trim(), ...biasParts].join(", ");
				const response = await fetch(`/api/google-maps/address-search?q=${encodeURIComponent(searchQuery)}`, {
					method: "GET",
					signal: controller.signal
				});
				const data = (await response.json()) as
					| { message?: string; suggestions?: AddressSuggestion[] }
					| undefined;
				if (!response.ok) {
					setAddressLookupError(data?.message ?? "Address search failed.");
					setAddressSuggestions([]);
					return;
				}
				setAddressSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				setAddressLookupError("Address search failed.");
				setAddressSuggestions([]);
			} finally {
				setIsSearchingAddresses(false);
			}
		}, 250);

		return () => {
			controller.abort();
			globalThis.clearTimeout(timeoutId);
		};
	}, [addressSearchTerm, form, open]);

	const latitudeValue = form.state.values.latitude;
	const longitudeValue = form.state.values.longitude;
	const hasSelectedLocation = latitudeValue.trim().length > 0 && longitudeValue.trim().length > 0;
	const selectedLocationSummary = [
		form.state.values.address.trim(),
		form.state.values.city.trim(),
		form.state.values.province.trim(),
		form.state.values.country.trim(),
		form.state.values.postalCode.trim()
	]
		.filter(part => part.length > 0)
		.join(", ");
	const mapPreviewUrl = buildStaticMapUrl(latitudeValue, longitudeValue);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 sm:max-w-2xl">
				<SheetHeader className="border-b-2 border-edge/50 px-6 py-5">
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<form
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={async event => {
						event.preventDefault();
						event.stopPropagation();
						await form.handleSubmit();
					}}>
					<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
						<p className="text-xs text-muted-foreground md:col-span-2">
							Fields marked with{" "}
							<span className="text-destructive" aria-hidden="true">
								*
							</span>{" "}
							are required.
						</p>
						<form.Field name="name">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);
								return (
									<div className="grid gap-2 md:col-span-2">
										<Label htmlFor={field.name}>
											Place name{" "}
											<span className="text-destructive" aria-hidden="true">
												*
											</span>
										</Label>
										<Input
											id={field.name}
											placeholder="e.g. High Park Playground"
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

						<form.Field name="placeType">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>
										Place type{" "}
										<span className="text-xs font-normal text-muted-foreground">(optional)</span>
									</Label>
									<Select
										value={field.state.value}
										onValueChange={value => field.handleChange(value)}>
										<SelectTrigger id={field.name}>
											<SelectValue placeholder="Select a type" />
										</SelectTrigger>
										<SelectContent>
											{PLACE_TYPE_OPTIONS.map(opt => (
												<SelectItem key={opt} value={opt}>
													{opt}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<div className="grid gap-0.5 md:col-span-2 pb-1">
							<p className="text-sm font-semibold text-foreground">Address</p>
							<p className="text-xs text-muted-foreground">
								Search and select an address first. You can still tweak the fields afterward if needed.
							</p>
						</div>

						<form.Field name="address">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>Address search</Label>
									<div className="relative">
										<Input
											id={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onFocus={() => setIsAddressDropdownOpen(true)}
											onChange={event => handleAddressFieldEdit("address", event.target.value)}
											placeholder="Search for an address"
											autoComplete="street-address"
										/>
										{isSearchingAddresses ? (
											<Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
										) : null}
										{isAddressDropdownOpen && addressSuggestions.length > 0 ? (
											<div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-md border-0 bg-background p-1 shadow-[0_3px_0_rgba(0,0,0,0.16),0_6px_20px_rgba(0,0,0,0.12)]">
												{addressSuggestions.map(suggestion => (
													<button
														type="button"
														key={`${suggestion.formattedAddress}-${suggestion.lat}-${suggestion.lng}`}
														className="flex w-full flex-col rounded-sm px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
														onMouseDown={event => {
															event.preventDefault();
															applyAddressSuggestion(suggestion);
														}}>
														<span className="text-sm font-medium text-foreground">
															{suggestion.address}
														</span>
														<span className="text-xs text-muted-foreground">
															{suggestion.formattedAddress}
														</span>
													</button>
												))}
											</div>
										) : null}
									</div>
									{addressLookupError ? (
										<p className="text-sm text-destructive">{addressLookupError}</p>
									) : (
										<p className="text-xs text-muted-foreground">
											Pick a suggestion to store the exact location in the background.
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="city">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>City</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => handleAddressFieldEdit("city", event.target.value)}
										placeholder="e.g. Toronto"
										autoComplete="address-level2"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="province">
							{field => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Province / State</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => handleAddressFieldEdit("province", event.target.value)}
										placeholder="e.g. Ontario"
										autoComplete="address-level1"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="country">
							{field => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Country</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => handleAddressFieldEdit("country", event.target.value)}
										placeholder="e.g. Canada"
										autoComplete="country-name"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="postalCode">
							{field => (
								<div className="grid gap-2 md:col-span-2">
									<Label htmlFor={field.name}>Postal / ZIP code</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => handleAddressFieldEdit("postalCode", event.target.value)}
										placeholder="e.g. M5V 2T6"
										autoComplete="postal-code"
									/>
								</div>
							)}
						</form.Field>

						{hasSelectedLocation ? (
							<div className="grid gap-2 md:col-span-2">
								<div className="flex items-center gap-1.5">
									<MapPinned className="size-3.5 text-muted-foreground" />
									<p className="text-sm font-medium text-foreground">Selected location</p>
								</div>
								<p className="text-xs text-muted-foreground">
									{selectedLocationSummary.length > 0 ? selectedLocationSummary : "Address selected"}
								</p>
								{mapPreviewUrl ? (
									<div className="overflow-hidden rounded-md border border-edge/40 bg-muted">
										<Image
											src={mapPreviewUrl}
											alt={`Map preview for ${selectedLocationSummary}`}
											width={600}
											height={200}
											className="h-[200px] w-full object-cover"
											unoptimized
										/>
									</div>
								) : null}
							</div>
						) : null}

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

						<form.Field name="estimatedAuditors">
							{field => {
								const validationMessage = getValidationMessage(field.state.meta.errors);
								return (
									<div className="grid gap-2 md:col-span-2">
										<Label htmlFor={field.name}>
											Estimated auditors{" "}
											<span className="text-xs font-normal text-muted-foreground">
												(optional)
											</span>
										</Label>
										<Input
											id={field.name}
											inputMode="numeric"
											placeholder="e.g. 2"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={event => field.handleChange(event.target.value)}
											aria-invalid={Boolean(validationMessage)}
										/>
										{validationMessage ? (
											<p className="text-sm text-destructive">{validationMessage}</p>
										) : (
											<p className="text-xs text-muted-foreground">
												How many auditors you expect to visit this place.
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
										placeholder="e.g. Enter from the north gate. Focus on the water feature and swing area."
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={event => field.handleChange(event.target.value)}
									/>
									<p className="text-xs text-muted-foreground">
										These instructions will be shown to auditors in the mobile app.
									</p>
								</div>
							)}
						</form.Field>
					</div>
					<SheetFooter className="border-t-2 border-edge/50 px-6 py-4">
						{submitError ? (
							<p aria-live="polite" className="mr-auto text-sm text-destructive">
								{submitError}
							</p>
						) : (
							<div className="mr-auto" />
						)}
						<div className="flex flex-col-reverse gap-2 sm:flex-row">
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
						</div>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
