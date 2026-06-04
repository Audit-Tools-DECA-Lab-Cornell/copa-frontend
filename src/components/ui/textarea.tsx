import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-field border border-input-border bg-input px-3 py-2 text-base transition-[color,box-shadow] outline-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.07)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:shadow-[inset_0_2px_4px_rgba(0,0,0,0.10)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
				className
			)}
			{...props}
		/>
	);
}

export { Textarea };
