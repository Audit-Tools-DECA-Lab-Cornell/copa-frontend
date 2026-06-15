"use client";

import { Check, ChevronDown, ChevronRight, Copy, FileJson2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type JsonViewerProps = {
	data: unknown;
	title?: string;
	defaultOpen?: boolean;
	className?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCollapsibleValue(value: unknown) {
	return Array.isArray(value) || isObject(value);
}

function getSummary(data: unknown) {
	if (Array.isArray(data)) return `Array(${data.length})`;
	if (data && typeof data === "object") {
		return `Object(${Object.keys(data as Record<string, unknown>).length} keys)`;
	}
	return typeof data;
}

function renderPrimitive(value: unknown) {
	if (typeof value === "string") {
		return <span className="text-emerald-300">&ldquo;{value}&ldquo;</span>;
	}

	if (typeof value === "number") {
		return <span className="text-amber-300">{String(value)}</span>;
	}

	if (typeof value === "boolean") {
		return <span className="text-violet-300">{String(value)}</span>;
	}

	if (value === null) {
		return <span className="text-zinc-500">null</span>;
	}

	return <span className="text-zinc-300">{String(value)}</span>;
}

export function JsonViewer({ data, title = "payload.json", defaultOpen = true, className }: JsonViewerProps) {
	const [open, setOpen] = React.useState(defaultOpen);
	const [copied, setCopied] = React.useState(false);
	const [openNodes, setOpenNodes] = React.useState<Record<string, boolean>>({});

	const pretty = React.useMemo(() => JSON.stringify(data, null, 2), [data]);
	const defaultNodeOpenDepth = 1;

	const onCopy = async () => {
		await navigator.clipboard.writeText(pretty);
		setCopied(true);
		setTimeout(() => setCopied(false), 1400);
	};

	const rows = React.useMemo(() => {
		const output: React.ReactNode[] = [];
		let lineNumber = 0;

		const addRow = (key: string, content: React.ReactNode) => {
			lineNumber += 1;

			output.push(
				<React.Fragment key={`${key}-${lineNumber}`}>
					<div className="select-none border-r border-white/5 bg-zinc-900/40 px-3 text-right text-zinc-500">
						{lineNumber}
					</div>
					<div
						className={cn(
							"whitespace-pre px-4 font-mono text-[13px] leading-6",
							lineNumber % 2 === 0 ? "bg-zinc-950/95" : "bg-zinc-950"
						)}>
						{content}
					</div>
				</React.Fragment>
			);
		};

		const toggleNode = (path: string, depth: number) => {
			const currentlyOpen = openNodes[path] ?? depth <= defaultNodeOpenDepth;
			setOpenNodes(prev => ({
				...prev,
				[path]: !currentlyOpen
			}));
		};

		const renderKey = (label?: string) => {
			if (!label) return null;

			return (
				<>
					<span className="text-sky-300">&ldquo;{label}&rdquo;</span>
					<span className="text-zinc-500">: </span>
				</>
			);
		};

		const renderNode = ({
			value,
			label,
			depth,
			path,
			isLast
		}: {
			value: unknown;
			label?: string;
			depth: number;
			path: string;
			isLast: boolean;
		}) => {
			if (!isCollapsibleValue(value)) {
				addRow(
					`${path}-leaf`,
					<div className="flex items-start" style={{ paddingLeft: `${depth * 16}px` }}>
						<span className="mr-2 inline-flex h-4 w-4 shrink-0" />
						<span>
							{renderKey(label)}
							{renderPrimitive(value)}
							{!isLast && <span className="text-zinc-500">,</span>}
						</span>
					</div>
				);
				return;
			}

			const expanded = openNodes[path] ?? depth <= defaultNodeOpenDepth;
			const entries = Array.isArray(value)
				? value.map((item, index) => [String(index), item] as const)
				: Object.entries(value);
			const openToken = Array.isArray(value) ? "[" : "{";
			const closeToken = Array.isArray(value) ? "]" : "}";
			const summary = getSummary(value);

			if (!expanded) {
				addRow(
					`${path}-collapsed`,
					<div className="flex items-start" style={{ paddingLeft: `${depth * 16}px` }}>
						<button
							type="button"
							onClick={() => toggleNode(path, depth)}
							className="mr-2 mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
							aria-label={`Expand ${label ?? "node"}`}>
							<ChevronRight className="h-4 w-4" />
						</button>

						<span>
							{renderKey(label)}
							<span className="text-zinc-300">{openToken}</span>
							<span className="text-zinc-500">…</span>
							<span className="text-zinc-300">{closeToken}</span>
							{!isLast && <span className="text-zinc-500">,</span>}
							<span className="ml-2 text-zinc-500">{summary}</span>
						</span>
					</div>
				);
				return;
			}

			addRow(
				`${path}-open`,
				<div className="flex items-start" style={{ paddingLeft: `${depth * 16}px` }}>
					<button
						type="button"
						onClick={() => toggleNode(path, depth)}
						className="mr-2 mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
						aria-label={`Collapse ${label ?? "node"}`}>
						<ChevronDown className="h-4 w-4" />
					</button>

					<span>
						{renderKey(label)}
						<span className="text-zinc-300">{openToken}</span>
					</span>
				</div>
			);

			entries.forEach(([childKey, childValue], index) => {
				renderNode({
					value: childValue,
					label: Array.isArray(value) ? undefined : childKey,
					depth: depth + 1,
					path: `${path}.${childKey}`,
					isLast: index === entries.length - 1
				});
			});

			addRow(
				`${path}-close`,
				<div className="flex items-start" style={{ paddingLeft: `${depth * 16}px` }}>
					<span className="mr-2 inline-flex h-4 w-4 shrink-0" />
					<span>
						<span className="text-zinc-300">{closeToken}</span>
						{!isLast && <span className="text-zinc-500">,</span>}
					</span>
				</div>
			);
		};

		if (isCollapsibleValue(data)) {
			addRow(
				"root-open",
				<div className="flex items-start">
					<span className="mr-2 inline-flex h-4 w-4 shrink-0" />
					<span className="text-zinc-300">{Array.isArray(data) ? "[" : "{"}</span>
				</div>
			);

			const rootEntries = Array.isArray(data)
				? data.map((item, index) => [String(index), item] as const)
				: Object.entries(data);

			rootEntries.forEach(([key, value], index) => {
				renderNode({
					value,
					label: Array.isArray(data) ? undefined : key,
					depth: 1,
					path: `root.${key}`,
					isLast: index === rootEntries.length - 1
				});
			});

			addRow(
				"root-close",
				<div className="flex items-start">
					<span className="mr-2 inline-flex h-4 w-4 shrink-0" />
					<span className="text-zinc-300">{Array.isArray(data) ? "]" : "}"}</span>
				</div>
			);
		} else {
			addRow(
				"root-primitive",
				<div className="flex items-start">
					<span className="mr-2 inline-flex h-4 w-4 shrink-0" />
					{renderPrimitive(data)}
				</div>
			);
		}

		return output;
	}, [data, openNodes]);

	return (
		<Collapsible
			open={open}
			onOpenChange={setOpen}
			className={cn(
				"group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_16px_48px_rgba(0,0,0,0.35)]",
				className
			)}>
			<div className="flex items-center justify-between border-b border-white/10 bg-zinc-900/80 px-3 py-2 backdrop-blur">
				<div className="flex min-w-0 items-center gap-3">
					<div className="flex items-center gap-1.5">
						<span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
						<span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
						<span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
					</div>

					<div className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1">
						<FileJson2 className="h-4 w-4 text-sky-300" />
						<span className="truncate font-mono text-[13px] text-zinc-200">{title}</span>
					</div>

					<span className="hidden rounded-md bg-white/5 px-2 py-1 font-mono text-xs text-zinc-400 sm:inline-flex">
						{getSummary(data)}
					</span>
				</div>

				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={onCopy}
						className="h-8 w-8 text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
						{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
					</Button>

					<CollapsibleTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-zinc-400 hover:bg-white/5 hover:text-zinc-100">
							{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
				</div>
			</div>

			<CollapsibleContent>
				<ScrollArea className="max-h-[520px] w-full overflow-y-auto">
					<div className="grid min-w-full grid-cols-[auto_1fr]">{rows}</div>
				</ScrollArea>
			</CollapsibleContent>
		</Collapsible>
	);
}
