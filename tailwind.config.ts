/** @type {import('tailwindcss').Config} */
const config = {
	content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
	theme: {
		extend: {
			borderRadius: {
				field: "6px",
				card: "8px",
				pill: "14px"
			},
			borderWidth: {
				tick: "3px"
			},
			boxShadow: {
				accent: "0 0 14px rgba(197, 138, 92, 0.12)",
				badge: "inset 0 1px 2px rgba(0,0,0,0.18)",
				card: "0 4px 12px rgba(0,0,0,0.10), 0 2px 0 var(--edge)",
				field: "inset 0 0 0 1px rgba(58, 52, 48, 0.9)",
				"header-block": "0 6px 0 rgba(0,0,0,0.22), 0 12px 28px rgba(0,0,0,0.18)",
				lift: "0 18px 40px rgba(0, 0, 0, 0.2)",
				topbar: "0 2px 8px rgba(0,0,0,0.08)",
				press: "inset 0 2px 6px rgba(0, 0, 0, 0.18)",
				"solid-primary": "0 2px 0 var(--color-solid-primary-edge), inset 0 1px 0 rgba(255,255,255,0.08)",
				"solid-neutral": "0 2px 0 var(--color-solid-neutral-edge), inset 0 1px 0 rgba(255,255,255,0.06)",
				"solid-danger": "0 2px 0 var(--color-solid-danger-edge), inset 0 1px 0 rgba(255,255,255,0.06)",
				"solid-press": "inset 0 2px 3px rgba(0,0,0,0.25)"
			},
			transitionTimingFunction: {
				field: "cubic-bezier(0.2, 0.8, 0.2, 1)"
			}
		}
	},
	plugins: []
};

export default config;
