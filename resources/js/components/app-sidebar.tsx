import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2, LayoutDashboard, Repeat, Users, Wallet, Banknote, BarChart3 } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Progress } from '@/components/ui/progress';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { home, dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: home(),
        icon: LayoutDashboard,
    },
    {
        title: 'Rounds',
        href: '#',
        icon: Repeat,
    },
    {
        title: 'Batch',
        href: home(),
        icon: Users,
    },
    {
        title: 'Contributions',
        href: '#',
        icon: Wallet,
    },
    {
        title: 'Payouts',
        href: '#',
        icon: Banknote,
    },
    {
        title: 'Reports',
        href: '#',
        icon: BarChart3,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

// Round status shown at a glance — swap the hardcoded values for props / a page prop
// from your Inertia controller (e.g. current round, total rounds, percent complete).
function RoundStatusCard({ current = 2, total = 4 }: { current?: number; total?: number }) {
    const percent = Math.round((current / total) * 100);

    return (
        <div className="mx-2 mb-1 rounded-lg bg-neutral-900 p-3 text-white group-data-[collapsible=icon]:hidden">
            <p className="text-xs font-medium">
                Round {current} of {total} in progress
            </p>
            <Progress value={percent} className="mt-2 h-1.5 bg-neutral-700" />
            <p className="mt-2 text-[11px] text-neutral-400">
                Your trial ends in 10 days.{' '}
                <Link href="#" className="text-white underline underline-offset-2">
                    See plan
                </Link>
            </p>
        </div>
    );
}

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}