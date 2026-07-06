import { buildCloudinaryUrl, getAssetDisplayUrl } from "@/lib/cloudinary-images";
import { type AssetIndex, type BuildCloudinaryUrlOptions, type CloudinaryVariant } from "@/lib/cloudinary-images";

function publicIdFromLocalAssetPath(localPath: string): string | null {
	const framedMatch = localPath.match(/^\/screenshots\/Framed\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (framedMatch) {
		return `web/framed/${framedMatch[1]}`;
	}

	const marketingMatch = localPath.match(/^\/marketing\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (marketingMatch) {
		return `web/marketing/${marketingMatch[1]}`;
	}

	return null;
}

function findAssetByPublicId(assetIndex: AssetIndex | undefined, publicId: string) {
	return assetIndex?.assets.find(asset => asset.cloudinaryPublicId === publicId) ?? null;
}

// Converts a local public/ reference to a Cloudinary delivery URL.
// Pass assetIndex when available so the URL builder can use width/height metadata for automatic upscaling.
export function screenshotUrl(
	localPath: string,
	variant: CloudinaryVariant = "full",
	options: BuildCloudinaryUrlOptions & { assetIndex?: AssetIndex } = {}
): string {
	const publicId = publicIdFromLocalAssetPath(localPath);
	if (!publicId) return localPath;

	const asset = findAssetByPublicId(options.assetIndex, publicId);
	if (asset) {
		return getAssetDisplayUrl(asset, variant, options) ?? localPath;
	}

	return buildCloudinaryUrl(publicId, variant, options) || localPath;
}

export function createScreenshotUrl(assetIndex: AssetIndex) {
	return (
		localPath: string,
		variant: CloudinaryVariant = "full",
		options: BuildCloudinaryUrlOptions = {}
	): string => {
		return screenshotUrl(localPath, variant, {
			...options,
			assetIndex
		});
	};
}
