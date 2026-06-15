"use client";

import { Check, Clock, Cloud, Copy, ImageOff, Monitor, Search, Smartphone, Tablet, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AssetEntry, type AssetIndex, getAssetDisplayUrl, getDeviceDimensions } from "@/lib/cloudinary-images";
import { cn } from "@/lib/utils";

// ── segmented filter group ─────────────────────────────────────────────────────

interface FilterOption<T extends string> {
	value: T;
	label: string;
}

function FilterGroup<T extends string>({
	label,
	options,
	value,
	onChange
}: Readonly<{ label: string; options: FilterOption<T>[]; value: T; onChange: (value: T) => void }>) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">{label}</span>
			<div className="inline-flex items-center gap-0.5 rounded-lg border border-edge/50 bg-surface-sunken p-1">
				{options.map(option => {
					const active = value === option.value;
					return (
						<button
							key={option.value}
							type="button"
							onClick={() => onChange(option.value)}
							aria-pressed={active}
							className={cn(
								"rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
								active
									? "bg-card text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							)}>
							{option.label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// ── copy-URL button ─────────────────────────────────────────────────────────────

function CopyUrlButton({ url, title }: Readonly<{ url: string; title: string }>) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(url).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		});
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			className="size-7 shrink-0"
			title={title}
			onClick={handleCopy}>
			{copied ? <Check className="size-3.5 text-status-success" /> : <Copy className="size-3.5" />}
		</Button>
	);
}

// ── device icon ───────────────────────────────────────────────────────────────

function DeviceIcon({ device, className }: Readonly<{ device: AssetEntry["device"]; className?: string }>) {
	if (device === "iphone") return <Smartphone className={className} />;
	if (device === "ipad") return <Tablet className={className} />;
	return <Monitor className={className} />;
}

// ── single asset card ─────────────────────────────────────────────────────────

function AssetCard({ asset }: Readonly<{ asset: AssetEntry }>) {
	const t = useTranslations("assets");
	const displayUrl = getAssetDisplayUrl(asset, "card");
	const { width, height } = getDeviceDimensions(asset.device);
	const isPortrait = width / height < 1;

	return (
		<div className="group overflow-hidden rounded-card border border-edge/40 bg-card transition-all duration-150 hover:-translate-y-0.5 hover:border-edge/70 hover:shadow-lg">
			{/* thumbnail */}
			<div
				className={cn(
					"relative w-full overflow-hidden bg-surface-sunken",
					isPortrait ? "aspect-[9/16]" : "aspect-video"
				)}>
				{displayUrl ? (
					<Image
						src={displayUrl}
						alt={asset.slug}
						fill
						sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						className="object-cover object-top transition-transform duration-200 group-hover:scale-[1.02]"
					/>
				) : (
					<div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
						<ImageOff className="size-6 text-muted-foreground/40" />
						<p className="text-xs font-medium text-muted-foreground/70">{t("card.notUploaded")}</p>
						<p className="break-all font-mono text-[10px] leading-4 text-muted-foreground/50">
							{asset.localPath}
						</p>
					</div>
				)}

				{/* delivery / status badge */}
				<div className="absolute bottom-2 right-2">
					{asset.uploadedAt ? (
						<span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
							<Cloud className="size-3" />
							{t("card.uploadedBadge")}
						</span>
					) : (
						<span className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-amber-300/90 backdrop-blur-sm">
							<Clock className="size-3" />
							{t("card.pendingBadge")}
						</span>
					)}
				</div>
			</div>

			{/* metadata */}
			<div className="space-y-2 p-3">
				<div className="flex items-start justify-between gap-2">
					<p
						className="truncate font-mono text-[11px] text-muted-foreground"
						title={asset.cloudinaryPublicId ?? asset.localPath}>
						{asset.cloudinaryPublicId ?? asset.filename}
					</p>
					{displayUrl && <CopyUrlButton url={displayUrl} title={t("card.copyUrl")} />}
				</div>

				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-muted-foreground">
						<DeviceIcon device={asset.device} className="size-3.5" />
					</span>
					<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
						{asset.type}
					</Badge>
					{asset.theme !== "light" && (
						<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
							{asset.theme}
						</Badge>
					)}
					{asset.role && (
						<Badge variant="outline" className="h-4 px-1.5 text-[10px]">
							{asset.role}
						</Badge>
					)}
				</div>
			</div>
		</div>
	);
}

// ── main gallery ──────────────────────────────────────────────────────────────

type SourceFilter = "all" | "mobile" | "web";
type TypeFilter = "all" | "framed" | "raw";
type DeviceFilter = "all" | "iphone" | "ipad" | "desktop";
type ThemeFilter = "all" | "light" | "dark";
type UploadFilter = "all" | "uploaded" | "pending";

export function AssetGallery({ index }: Readonly<{ index: AssetIndex }>) {
	const t = useTranslations("assets");
	const [source, setSource] = useState<SourceFilter>("all");
	const [assetType, setAssetType] = useState<TypeFilter>("all");
	const [device, setDevice] = useState<DeviceFilter>("all");
	const [theme, setTheme] = useState<ThemeFilter>("all");
	const [upload, setUpload] = useState<UploadFilter>("all");
	const [query, setQuery] = useState("");

	const filtered = useMemo(() => {
		return index.assets.filter(a => {
			if (source !== "all" && a.source !== source) return false;
			if (assetType !== "all" && a.type !== assetType) return false;
			if (device !== "all" && a.device !== device) return false;
			if (theme !== "all" && a.theme !== theme) return false;
			if (upload === "uploaded" && !a.uploadedAt) return false;
			if (upload === "pending" && a.uploadedAt) return false;
			if (query) {
				const q = query.toLowerCase();
				return (
					a.slug.includes(q) ||
					a.filename.includes(q) ||
					a.section.includes(q) ||
					(a.role ?? "").includes(q) ||
					(a.cloudinaryPublicId ?? "").includes(q)
				);
			}
			return true;
		});
	}, [index.assets, source, assetType, device, theme, upload, query]);

	const pendingCount = index.totalCount - index.cloudinaryUploadedCount;
	const hasActiveFilters =
		source !== "all" ||
		assetType !== "all" ||
		device !== "all" ||
		theme !== "all" ||
		upload !== "all" ||
		query !== "";

	function resetFilters() {
		setSource("all");
		setAssetType("all");
		setDevice("all");
		setTheme("all");
		setUpload("all");
		setQuery("");
	}

	// Filter option labels are looked up by dynamic key (filters.all, filters.mobile, …);
	// the typed `t` can't validate a computed key, so resolve labels through a plain lookup.
	const tLabel = t as unknown as (key: string) => string;
	const makeOptions = <T extends string>(values: readonly T[]): FilterOption<T>[] =>
		values.map(value => ({ value, label: tLabel(`filters.${value}`) }));

	return (
		<div className="space-y-5">
			{/* toolbar */}
			<div className="space-y-4 rounded-card border border-edge/40 bg-card p-4">
				{/* search + result meta */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("searchPlaceholder")}
							value={query}
							onChange={e => setQuery(e.target.value)}
							className="h-9 pl-8 text-sm"
						/>
					</div>
					<div className="flex items-center justify-between gap-2 sm:justify-end">
						<span className="text-xs font-medium tabular-nums text-muted-foreground">
							{filtered.length === index.totalCount
								? t("resultsAll", { count: index.totalCount })
								: t("resultsFiltered", { filtered: filtered.length, total: index.totalCount })}
						</span>
						{hasActiveFilters && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-7 gap-1 px-2 text-xs"
								onClick={resetFilters}>
								<X className="size-3.5" />
								{t("clearFilters")}
							</Button>
						)}
					</div>
				</div>

				{/* filter groups */}
				<div className="flex flex-wrap gap-x-6 gap-y-3">
					<FilterGroup
						label={t("filters.source")}
						value={source}
						onChange={setSource}
						options={makeOptions<SourceFilter>(["all", "mobile", "web"])}
					/>
					<FilterGroup
						label={t("filters.type")}
						value={assetType}
						onChange={setAssetType}
						options={makeOptions<TypeFilter>(["all", "framed", "raw"])}
					/>
					<FilterGroup
						label={t("filters.device")}
						value={device}
						onChange={setDevice}
						options={makeOptions<DeviceFilter>(["all", "iphone", "ipad", "desktop"])}
					/>
					<FilterGroup
						label={t("filters.theme")}
						value={theme}
						onChange={setTheme}
						options={makeOptions<ThemeFilter>(["all", "light", "dark"])}
					/>
					<FilterGroup
						label={t("filters.status")}
						value={upload}
						onChange={setUpload}
						options={makeOptions<UploadFilter>(["all", "uploaded", "pending"])}
					/>
				</div>
			</div>

			{/* pending hint */}
			{pendingCount > 0 && (
				<div className="flex items-center gap-3 rounded-card border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
					<Clock className="size-4 shrink-0 text-amber-500" />
					<span>
						{t.rich("pendingHint", {
							count: pendingCount,
							code: chunks => (
								<code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">{chunks}</code>
							)
						})}
					</span>
				</div>
			)}

			{/* grid */}
			{filtered.length === 0 ? (
				<div className="rounded-card border border-edge/40 bg-card p-10 text-center text-sm text-muted-foreground">
					{t("noMatch")}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filtered.map(asset => (
						<AssetCard key={asset.id} asset={asset} />
					))}
				</div>
			)}
		</div>
	);
}
