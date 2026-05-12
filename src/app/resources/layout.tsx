import { PublicResourcesShell } from "@/components/resources/public-resources-shell";

export default function PublicResourcesLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <PublicResourcesShell>{children}</PublicResourcesShell>;
}
