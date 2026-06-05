"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import {
	ChevronDown,
	ClipboardList,
	DatabaseIcon,
	FileText,
	FolderKanban,
	LayoutDashboard,
	LogOut,
	MapPin,
	Menu,
	Form,
	PanelLeftClose,
	PanelLeftOpen,
	Settings,
	MonitorCog,
	Shield,
	Users,
	type LucideIcon
} from "lucide-react";

import { clearBrowserAuthSession } from "@/lib/auth/browser-session";
import type { UserRole } from "@/lib/auth/role";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Image from "next/image";

export interface AppShellProps {
	role: UserRole;
	auditorCode: string | null;
	userName: string | null;
	userEmail: string | null;
	children: React.ReactNode;
}

interface NavItem {
	label: string;
	href: string;
	icon: LucideIcon;
}

type NavigationTranslator = (key: string) => string;

function getNavItems(role: UserRole, t: NavigationTranslator): NavItem[] {
	if (role === "admin") {
		return [
			{ label: t("dashboard"), href: "/admin/dashboard", icon: LayoutDashboard },
			{ label: t("accounts"), href: "/admin/accounts", icon: Shield },
			{ label: t("projects"), href: "/admin/projects", icon: FolderKanban },
			{ label: t("places"), href: "/admin/places", icon: MapPin },
			{ label: t("auditors"), href: "/admin/auditors", icon: Users },
			{ label: t("audits"), href: "/admin/audits", icon: Form },
			{ label: t("reports"), href: "/admin/reports", icon: ClipboardList },
			{ label: t("rawData"), href: "/admin/raw-data", icon: DatabaseIcon },
			{ label: t("instruments"), href: "/admin/instruments", icon: FileText },
			{ label: t("system"), href: "/admin/system", icon: MonitorCog },
			{ label: t("settings"), href: "/settings", icon: Settings }
		];
	}

	if (role === "manager") {
		return [
			{ label: t("dashboard"), href: "/manager/dashboard", icon: LayoutDashboard },
			{ label: t("projects"), href: "/manager/projects", icon: FolderKanban },
			{ label: t("places"), href: "/manager/places", icon: MapPin },
			{ label: t("auditors"), href: "/manager/auditors", icon: Users },
			{ label: t("audits"), href: "/manager/audits", icon: Form },
			{ label: t("reports"), href: "/manager/reports", icon: ClipboardList },
			{ label: t("rawData"), href: "/manager/raw-data", icon: DatabaseIcon },
			{ label: t("settings"), href: "/settings", icon: Settings }
		];
	}

	return [
		{ label: t("dashboard"), href: "/auditor/dashboard", icon: LayoutDashboard },
		{ label: t("reports"), href: "/auditor/reports", icon: ClipboardList },
		{ label: t("settings"), href: "/settings", icon: Settings }
	];
}

function NavLinks({
	items,
	onNavigate,
	isCollapsed = false
}: Readonly<{ items: NavItem[]; onNavigate?: () => void; isCollapsed?: boolean }>) {
	const pathname = usePathname();

	return (
		<nav className="grid gap-1.5">
			{items.map(item => {
				const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
				const Icon = item.icon;

				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onNavigate}
						title={isCollapsed ? item.label : undefined}
						className={cn(
							"flex min-h-11 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-[background,box-shadow,color] duration-75",
							isCollapsed && "mx-auto size-11 min-h-0 justify-center p-0",
							isActive
								? "bg-solid-neutral text-solid-neutral-text shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] hover:bg-(--solid-neutral-edge) hover:text-solid-neutral-text"
								: "text-muted-foreground hover:bg-accent hover:text-foreground"
						)}>
						<Icon className="size-5" aria-hidden="true" />
						<span className={cn("leading-5", isCollapsed && "sr-only")}>{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);
}

function UserMenu({
	role,
	auditorCode,
	userName,
	userEmail
}: Readonly<{ role: UserRole; auditorCode: string | null; userName: string | null; userEmail: string | null }>) {
	const router = useRouter();
	const t = useTranslations("shell.userMenu");
	const commonT = useTranslations("common.roles");

	const label = userName
		? userName
		: role === "auditor"
			? auditorCode
				? t("auditorWithCode", { code: auditorCode })
				: commonT("auditor")
			: role === "admin"
				? commonT("administrator")
				: commonT("manager");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="secondary" size="sm">
					<span className="max-w-56 truncate">{label}</span>
					<ChevronDown className="h-4 w-4 opacity-100" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="flex flex-col gap-1 flex-1">
					<span className="text-lg flex-1 overflow-x-scroll font-semibold no-scrollbar whitespace-nowrap">
						{userName ?? t("accountLabel")}
					</span>
					{userEmail ? (
						<span className="text-xs font-normal flex-1 overflow-x-scroll no-scrollbar whitespace-nowrap text-muted-foreground">
							{userEmail}
						</span>
					) : null}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/settings" className="flex items-center gap-2">
						<Settings className="h-4 w-4" aria-hidden="true" />
						<span>{t("settings")}</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="flex items-center gap-2"
					onClick={() => {
						clearBrowserAuthSession();
						router.push("/login");
					}}>
					<LogOut className="h-4 w-4" aria-hidden="true" />
					<span>{t("signOut")}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AppShell({ role, auditorCode, userName, userEmail, children }: Readonly<AppShellProps>) {
	const navigationT = useTranslations("shell.navigation");
	const shellT = useTranslations("shell");
	const roleT = useTranslations("common.workspace");
	const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);
	const navItems = getNavItems(role, navigationT);
	const roleLabel =
		role === "admin" ? roleT("administrator") : role === "manager" ? roleT("manager") : roleT("auditor");

	return (
		<div className="min-h-dvh bg-background">
			<div
				className={cn(
					"mx-auto grid w-full grid-cols-1",
					isSidebarCollapsed ? "md:grid-cols-[84px_1fr]" : "md:grid-cols-[280px_1fr] xl:grid-cols-[296px_1fr]"
				)}>
				<aside className="hidden border-r-2 border-edge bg-sidebar/90 transition-all md:block">
					<div className="flex h-dvh flex-col">
						<div
							className={cn(
								"space-y-3 px-5 pt-5 pb-2",
								isSidebarCollapsed && "space-y-2 px-5 pt-5 pb-2.5"
							)}>
							<div
								className={cn(
									"flex items-start gap-3 relative",
									isSidebarCollapsed ? "justify-between" : "justify-between"
								)}>
								<div className="flex min-w-0 items-center gap-3">
									<div className="flex size-18 items-center justify-end ml-0.5 shadow-focus">
										<Image src="/icon.png" alt="COPA Tool" width={40} height={40} />
									</div>
									<div className={cn("grid", isSidebarCollapsed && "hidden")}>
										<span className="text-base font-semibold leading-5">
											{shellT("productName")}
										</span>
										<span className="text-sm text-muted-foreground">
											{shellT("productTagline")}
										</span>
									</div>
								</div>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn(
										"shrink-0 size-11 flex px-4 absolute -right-4.5 top-19 z-10 items-center rounded-xl transition-all hover:bg-accent",
										isSidebarCollapsed && "hidden"
									)}
									aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
									title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
									onClick={() => {
										setIsSidebarCollapsed(prev => !prev);
									}}>
									{isSidebarCollapsed ? (
										<PanelLeftOpen className="size-5" aria-hidden="true" />
									) : (
										<PanelLeftClose className="size-5" aria-hidden="true" />
									)}
								</Button>
							</div>
							<div
								className={cn(
									"inline-flex w-fit rounded-md border-0 bg-solid-primary px-3 py-1 text-(length:--workspace-label-size) font-semibold tracking-(--workspace-label-tracking) text-solid-primary-text shadow-solid-primary uppercase",
									isSidebarCollapsed && "sr-only"
								)}>
								{roleLabel}
							</div>
							<div className={cn("flex", isSidebarCollapsed ? "justify-center" : "hidden")}>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className={cn(
										"shrink-0 size-11 flex  items-center rounded-xl transition-all hover:bg-accent"
									)}
									aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
									title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
									onClick={() => {
										setIsSidebarCollapsed(prev => !prev);
									}}>
									{isSidebarCollapsed ? (
										<PanelLeftOpen className="size-5" aria-hidden="true" />
									) : (
										<PanelLeftClose className="size-5" aria-hidden="true" />
									)}
								</Button>
							</div>
						</div>
						<Separator />
						<div className={cn("flex-1 overflow-auto p-3", isSidebarCollapsed && "px-2")}>
							<p
								className={cn(
									"px-3 pb-2 text-(length:--workspace-label-size) font-semibold tracking-(--workspace-label-tracking) text-text-secondary uppercase",
									isSidebarCollapsed && "sr-only"
								)}>
								{shellT("workspaceLabel")}
							</p>
							<NavLinks items={navItems} isCollapsed={isSidebarCollapsed} />
						</div>
					</div>
				</aside>

				<div className="min-w-0">
					<header className="sticky top-0 z-10 border-b-2 border-edge bg-background/90 shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur">
						<div className="flex h-16 items-center gap-3 px-4 md:px-6">
							<Sheet>
								<SheetTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="md:hidden"
										aria-label={shellT("openMenu")}>
										<Menu className="h-5 w-5" aria-hidden="true" />
									</Button>
								</SheetTrigger>
								<SheetContent side="left" className="w-80 p-0">
									<SheetHeader className="px-4 py-4">
										<SheetTitle>{shellT("navigationTitle")}</SheetTitle>
									</SheetHeader>
									<Separator />
									<div className="p-3">
										<NavLinks items={navItems} />
									</div>
								</SheetContent>
							</Sheet>

							<div className="text-sm font-semibold md:hidden">{shellT("mobileBrand")}</div>
							<div className="flex-1" />
							<UserMenu role={role} auditorCode={auditorCode} userName={userName} userEmail={userEmail} />
						</div>
					</header>

					<main className="px-4 py-6 md:px-6 md:py-4">{children}</main>
				</div>
			</div>
		</div>
	);
}
