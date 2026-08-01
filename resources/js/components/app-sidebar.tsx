import { Link, usePage } from '@inertiajs/react';
import { Banknote, BookOpen, Users, Wallet } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { index } from '@/routes/batches';
import { batch } from '@/routes/member';
import type { NavItem } from '@/types';

const managerNavItems: NavItem[] = [
    {
        title: 'Batches',
        href: index(),
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
];

const memberNavItems: NavItem[] = [
    {
        title: 'My Savings Circles',
        href: batch(),
        icon: Users,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Website',
        href: '/',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { url } = usePage();
    const isMemberSide = url.startsWith('/member');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isMemberSide ? batch() : index()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={isMemberSide ? memberNavItems : managerNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
