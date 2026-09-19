import marketingAssets from "@/data/marketing-assets.json";
import {
	type AssetIndex,
	buildCloudinaryUrl,
	type BuildCloudinaryUrlOptions,
	type CloudinaryVariant,
	COPA_CLOUDINARY_FOLDER,
	getAssetDisplayUrl
} from "@/lib/cloudinary-images";

const marketingDelivery: Readonly<Record<string, string>> = marketingAssets;

/**
 * Maps a landing-page local path to the Cloudinary public ID under `copa/`.
 * Framed dashboard shots: `/screenshots/Framed/...` → `copa/web/framed/...`
 * Marketing shots: `/marketing/...` → `copa/web/marketing/...`
 */
function publicIdFromLocalAssetPath(localPath: string): string | null {
	const framedMatch = localPath.match(/^\/screenshots\/Framed\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (framedMatch) {
		return `${COPA_CLOUDINARY_FOLDER}/web/framed/${framedMatch[1]}`;
	}

	const marketingMatch = localPath.match(/^\/marketing\/(.+)\.(?:png|jpg|jpeg|webp)$/i);
	if (marketingMatch) {
		return `${COPA_CLOUDINARY_FOLDER}/web/marketing/${marketingMatch[1]}`;
	}

	return null;
}

function findAssetByPublicId(assetIndex: AssetIndex | undefined, publicId: string) {
	return assetIndex?.assets.find(asset => asset.cloudinaryPublicId === publicId) ?? null;
}

export function screenshotUrl(
	localPath: string,
	variant: CloudinaryVariant = "full",
	options: BuildCloudinaryUrlOptions & { assetIndex?: AssetIndex } = {}
): string {
	const refreshedAsset = marketingDelivery[localPath];
	if (refreshedAsset) return refreshedAsset;

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
