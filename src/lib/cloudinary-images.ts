// Cloudinary delivery URL builder and shared asset types.
// Originals stay unchanged in Cloudinary; resizing, optimization, and optional upscaling happen at delivery time.

export type CloudinaryVariant = "thumbnail" | "card" | "full";

type CloudinaryCropMode = "limit" | "scale" | "fit" | "fill" | "thumb" | "pad";
type CloudinaryUpscaleMode = "auto" | "always" | "never";

type CloudinaryVariantConfig = {
	width: number;
	crop: CloudinaryCropMode;
	quality: "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low";
	dprAuto: boolean;
	expectedDpr: number;
};

const VARIANT_CONFIGS: Record<CloudinaryVariant, CloudinaryVariantConfig> = {
	thumbnail: {
		width: 200,
		crop: "fill",
		quality: "auto",
		dprAuto: true,
		expectedDpr: 2
	},
	card: {
		width: 480,
		crop: "fill",
		quality: "auto",
		dprAuto: true,
		expectedDpr: 2
	},
	full: {
		width: 960,
		crop: "limit",
		quality: "auto:good",
		dprAuto: true,
		expectedDpr: 3
	}
};

const CLOUDINARY_UPSCALE_MAX_INPUT_PIXELS = 4_200_000;
const CLOUDINARY_UPSCALE_FACTOR = 4;

export interface AssetEntry {
	id: string;
	source: "web" | "mobile";
	type: "framed" | "raw" | "marketing";
	device: "desktop" | "iphone" | "ipad";
	theme: "light" | "dark";
	category: "screenshots" | "marketing";
	role: string | null;
	filename: string;
	slug: string;
	section: string;
	route: string | null;
	localPath: string;
	cloudinaryPublicId: string | null;
	cloudinaryVersion?: number | string | null;
	cloudinarySecureUrl?: string | null;
	uploadedAt: string | null;
	width?: number | null;
	height?: number | null;
	aspectRatio?: number | null;
	bytes?: number | null;
	format?: string | null;
	sha256?: string | null;
	tags: string[];
}

export interface AssetIndex {
	generatedAt: string;
	totalCount: number;
	cloudinaryUploadedCount: number;
	breakdown: {
		mobileFramed: number;
		mobileRaw: number;
		webFramed: number;
		webRaw: number;
		webMarketing: number;
	};
	assets: AssetEntry[];
}

export type BuildCloudinaryUrlOptions = {
	width?: number;
	height?: number;
	crop?: CloudinaryCropMode;
	quality?: "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low";
	format?: "auto" | "avif" | "webp" | "png" | "jpg";
	dprAuto?: boolean;
	expectedDpr?: number;
	upscale?: CloudinaryUpscaleMode;
	gravity?: string;
	background?: string;
	extraTransformations?: string[];
};

function getCloudinaryCloudName(): string {
	return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
}

function encodePublicId(publicId: string): string {
	return publicId
		.split("/")
		.map(part => encodeURIComponent(part))
		.join("/");
}

function cleanNumber(value: number): number {
	return Math.max(1, Math.round(value));
}

function getPublicId(input: string | AssetEntry): string | null {
	return typeof input === "string" ? input : input.cloudinaryPublicId;
}

function canUseCloudinaryUpscale(asset: AssetEntry | null): boolean {
	if (!asset?.width || !asset.height) return false;
	return asset.width * asset.height < CLOUDINARY_UPSCALE_MAX_INPUT_PIXELS;
}

function shouldApplyUpscale(asset: AssetEntry | null, options: RequiredVariantOptions): boolean {
	if (options.upscale === "never") return false;
	if (!canUseCloudinaryUpscale(asset)) return false;
	if (options.upscale === "always") return true;

	const sourceWidth = asset?.width ?? 0;
	const sourceHeight = asset?.height ?? 0;
	const expectedDpr = Math.max(1, options.expectedDpr);
	const requestedWidth = cleanNumber(options.width * expectedDpr);
	const requestedHeight = options.height ? cleanNumber(options.height * expectedDpr) : null;

	return requestedWidth > sourceWidth || (requestedHeight !== null && requestedHeight > sourceHeight);
}

function capUpscaledDimension(requested: number, source: number | null | undefined): number {
	if (!source) return cleanNumber(requested);
	return cleanNumber(Math.min(requested, source * CLOUDINARY_UPSCALE_FACTOR));
}

type RequiredVariantOptions = {
	width: number;
	height?: number;
	crop: CloudinaryCropMode;
	quality: "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low";
	format: "auto" | "avif" | "webp" | "png" | "jpg";
	dprAuto: boolean;
	expectedDpr: number;
	upscale: CloudinaryUpscaleMode;
	gravity?: string;
	background?: string;
	extraTransformations: string[];
};

function resolveOptions(variant: CloudinaryVariant, options: BuildCloudinaryUrlOptions): RequiredVariantOptions {
	const config = VARIANT_CONFIGS[variant];

	return {
		width: options.width ?? config.width,
		height: options.height,
		crop: options.crop ?? config.crop,
		quality: options.quality ?? config.quality,
		format: options.format ?? "auto",
		dprAuto: options.dprAuto ?? config.dprAuto,
		expectedDpr: options.expectedDpr ?? config.expectedDpr,
		upscale: options.upscale ?? "auto",
		gravity: options.gravity,
		background: options.background,
		extraTransformations: options.extraTransformations ?? []
	};
}

function buildTransformation(
	asset: AssetEntry | null,
	variant: CloudinaryVariant,
	options: BuildCloudinaryUrlOptions
): string {
	const resolved = resolveOptions(variant, options);
	const applyUpscale = shouldApplyUpscale(asset, resolved);

	const width = applyUpscale ? capUpscaledDimension(resolved.width, asset?.width) : cleanNumber(resolved.width);
	const height = resolved.height
		? applyUpscale
			? capUpscaledDimension(resolved.height, asset?.height)
			: cleanNumber(resolved.height)
		: null;

	const resizeParts = [`c_${resolved.crop}`, `w_${width}`];

	if (height) resizeParts.push(`h_${height}`);
	if (resolved.gravity) resizeParts.push(`g_${resolved.gravity}`);
	if (resolved.background) resizeParts.push(`b_${resolved.background}`);
	if (resolved.dprAuto) resizeParts.push("dpr_auto");

	const transformations: string[] = [];

	if (applyUpscale) {
		transformations.push("e_upscale");
	}

	transformations.push(resizeParts.join(","));
	transformations.push(...resolved.extraTransformations);
	transformations.push(`f_${resolved.format},q_${resolved.quality}`);

	return transformations.join("/");
}

export function buildCloudinaryUrl(
	input: string | AssetEntry,
	variant: CloudinaryVariant = "card",
	options: BuildCloudinaryUrlOptions = {}
): string {
	const cloud = getCloudinaryCloudName();
	const publicId = getPublicId(input);

	if (!cloud || !publicId) return "";

	const asset = typeof input === "string" ? null : input;
	const transformation = buildTransformation(asset, variant, options);
	const version = asset?.cloudinaryVersion ? `/v${asset.cloudinaryVersion}` : "";
	const encodedPublicId = encodePublicId(publicId);

	return `https://res.cloudinary.com/${cloud}/image/upload/${transformation}${version}/${encodedPublicId}`;
}

export function getAssetDisplayUrl(
	asset: AssetEntry,
	variant: CloudinaryVariant = "card",
	options: BuildCloudinaryUrlOptions = {}
): string | null {
	if (!asset.uploadedAt || !asset.cloudinaryPublicId) return null;
	return buildCloudinaryUrl(asset, variant, options);
}

export function getDeviceDimensions(device: AssetEntry["device"]): { width: number; height: number } {
	switch (device) {
		case "iphone":
			return { width: 393, height: 852 };
		case "ipad":
			return { width: 1032, height: 1376 };
		case "desktop":
			return { width: 1440, height: 900 };
	}
}
