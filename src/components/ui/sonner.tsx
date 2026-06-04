"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />
			}}
			style={
				{
					"--normal-bg": "var(--background)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--edge)",
					"--border-radius": "var(--radius-md)",
					"--toast-shadow": "0 3px 0 rgba(0,0,0,0.16), 0 6px 20px rgba(0,0,0,0.12)"
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
