// Cloudinary delivery URL builder and shared asset types.
// Cloud name comes from NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME.

export type CloudinaryVariant = "thumbnail" | "card" | "full";

const VARIANT_TRANSFORMS: Record<CloudinaryVariant, string> = {
	thumbnail: "w_200,c_fill,f_auto,q_auto",
	card: "w_480,c_fill,f_auto,q_auto",
	full: "w_1440,f_auto,q_auto"
};

export interface AssetEntry {
	id: string;
	source: "web" | "mobile";
	type: "framed" | "raw";
	device: "desktop" | "iphone" | "ipad";
	theme: "light" | "dark";
	category: "screenshots";
	role: string | null;
	filename: string;
	slug: string;
	section: string;
	route: string | null;
	localPath: string; // path relative to assets/ root
	cloudinaryPublicId: string | null;
	uploadedAt: string | null;
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
	};
	assets: AssetEntry[];
}

// https://res.cloudinary.com/{cloud}/{transforms}/{public_id}
export function buildCloudinaryUrl(publicId: string, variant: CloudinaryVariant = "card"): string {
	const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
	if (!cloud) return "";
	return `https://res.cloudinary.com/${cloud}/image/upload/${VARIANT_TRANSFORMS[variant]}/${publicId}`;
}

// Returns a Cloudinary URL only once the asset is confirmed on Cloudinary
// (uploadedAt is set by the upload script). The public_id is pre-computed for
// every asset, so gating on uploadedAt is what distinguishes a live image from
// one that has not been pushed yet — otherwise pending cards would request a
// public_id that does not exist on Cloudinary and render as a broken image.
export function getAssetDisplayUrl(asset: AssetEntry, variant: CloudinaryVariant = "card"): string | null {
	if (asset.uploadedAt && asset.cloudinaryPublicId) return buildCloudinaryUrl(asset.cloudinaryPublicId, variant);
	return null;
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
