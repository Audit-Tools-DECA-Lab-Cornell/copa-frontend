import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
	reactCompiler: true,
	cacheComponents: true,
	experimental: {
		optimizePackageImports: ["lucide-react", "radix-ui", "@tanstack/react-query", "@tanstack/react-table"]
	},
	images: {
		formats: ["image/avif", "image/webp"],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "res.cloudinary.com"
			}
		]
	}
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
