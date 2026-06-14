"use client";

/**
 * Client island for the Interactive Platform Tour's sticky stop navigation.
 *
 * The active-stop highlight is the only interactive behavior on that page, so it
 * lives here as a self-contained island. The tour page itself stays a server
 * component and renders statically.
 */

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type TourStop = { id: string; label: string };

const TOUR_STOPS: TourStop[] = [
	{ id: "stop-coordinate", label: "Coordinate" },
	{ id: "stop-oversee", label: "Oversee" },
	{ id: "stop-field", label: "In the field" },
	{ id: "stop-score", label: "Score" },
	{ id: "stop-report", label: "Report & export" }
];

export function TourNav() {
	const [activeStop, setActiveStop] = useState(TOUR_STOPS[0]?.id ?? "");

	const handleScroll = useCallback(() => {
		const scrollY = window.scrollY + 180;
		let current = TOUR_STOPS[0]?.id ?? "";
		for (const stop of TOUR_STOPS) {
			const el = document.getElementById(stop.id);
			if (el && el.offsetTop <= scrollY) {
				current = stop.id;
			}
		}
		setActiveStop(current);
	}, []);

	useEffect(() => {
		window.addEventListener("scroll", handleScroll, { passive: true });
		// Defer the initial sync out of the effect body so it doesn't setState synchronously.
		const initialFrame = requestAnimationFrame(handleScroll);
		return () => {
			window.removeEventListener("scroll", handleScroll);
			cancelAnimationFrame(initialFrame);
		};
	}, [handleScroll]);

	return (
		<nav
			aria-label="Tour stops"
			className="sticky top-16 z-40 hidden border-b border-edge/50 bg-background/95 backdrop-blur lg:block">
			<div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
				<span className="mr-2 shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
					Tour
				</span>
				{TOUR_STOPS.map((stop, i) => (
					<a
						key={stop.id}
						href={`#${stop.id}`}
						className={cn(
							"flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-out",
							activeStop === stop.id
								? "bg-primary/10 text-primary"
								: "text-muted-foreground hover:bg-muted hover:text-foreground"
						)}>
						<span
							className={cn(
								"flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
								activeStop === stop.id
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground"
							)}>
							{i + 1}
						</span>
						{stop.label}
					</a>
				))}
			</div>
		</nav>
	);
}
