import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Banknote, ChevronDown, Clock3, Info, MoreHorizontal, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import type { ReactNode } from 'react';
import { CreateMemberDialog } from '@/components/ui/batches/create-member';

type MemberStatus = 'Released' | 'Active' | 'Slashed';

interface Member {
    id: string;
    name: string;
    address: string;
    contribution: string;
    saved: string;
    progress: number;
    percent: number;
    due: string;
    remaining: string;
    autoPay: boolean;
    nextDate: string | null;
    status: MemberStatus;
}

const defaultMembers: Member[] = [
    {
        id: '01',
        name: 'Member 1',
        address: 'bchtest:qqvh...f9a',
        contribution: '0.5 BCH',
        saved: '0.5 BCH',
        progress: 100,
        percent: 100,
        due: 'Round 1',
        remaining: '0 BCH',
        autoPay: true,
        nextDate: null,
        status: 'Released',
    },
    {
        id: '02',
        name: 'Member 2',
        address: 'bchtest:qzfx...vqk',
        contribution: '0.5 BCH',
        saved: '0.5 BCH',
        progress: 100,
        percent: 100,
        due: 'Round 2',
        remaining: '0 BCH',
        autoPay: true,
        nextDate: 'Round 3',
        status: 'Active',
    },
    {
        id: '03',
        name: 'Member 3',
        address: 'bchtest:qpwa...91m',
        contribution: '0.5 BCH',
        saved: '0.5 BCH',
        progress: 100,
        percent: 100,
        due: 'Round 2',
        remaining: '0 BCH',
        autoPay: true,
        nextDate: 'Round 3',
        status: 'Active',
    },
    {
        id: '04',
        name: 'Member 4',
        address: 'bchtest:qr7t...g7h',
        contribution: '0.5 BCH',
        saved: '0 BCH',
        progress: 0,
        percent: 0,
        due: 'Round 2',
        remaining: '0.5 BCH',
        autoPay: false,
        nextDate: null,
        status: 'Slashed',
    },
];

function TopBar({ batchName }: { batchName: string }) {
    return (
        <div className="px-8 pt-8 pb-6">
            <Link
                href="/"
                className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Batches
            </Link>
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{batchName}</h2>
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 font-normal">
                                <span className="h-5 w-6 rounded bg-emerald-600" />
                                •••• 6799
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>bchtest:qqvh6w...6799</DropdownMenuItem>
                            <DropdownMenuItem>bchtest:qzfx9j...2vqk</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <CreateMemberDialog />
                </div>
            </div>
        </div>
    );
}

function TotalBalanceCard() {
    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardContent className="flex items-center justify-between p-6">
                <div>
                    <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total pot balance
                        <Info className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-3xl font-semibold tracking-tight">2.0 BCH</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                    <Banknote className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
                </div>
            </CardContent>
        </Card>
    );
}

function MemberCard({ member }: { member: Member }) {
    const statusColor =
        member.status === 'Released'
            ? 'text-emerald-700 bg-emerald-50'
            : member.status === 'Slashed'
                ? 'text-red-700 bg-red-50'
                : 'text-neutral-600 bg-neutral-100';

    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-0">
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-neutral-100 font-mono text-[11px] text-neutral-600">
                            {member.id}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm leading-none font-medium">{member.name}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{member.address}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="-mr-1.5 h-7 w-7">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-4">
                <p className="text-xl font-semibold tracking-tight">{member.contribution}</p>

                <div className="space-y-2">
                    <Progress value={member.progress} className="h-1.5" />
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            <span className="font-medium">{member.saved}</span>{' '}
                            <span className="text-muted-foreground">contributed</span>
                        </span>
                        <span className="text-muted-foreground">{member.percent}%</span>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due</span>
                    <span>{member.due}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span>{member.remaining}</span>
                </div>

            </CardContent>
        </Card>
    );
}

export default function MembersDashboard({
    batchName = 'Circle Alpha',
    members = defaultMembers,
}: {
    batchName?: string;
    members?: Member[];
}) {
    return (
        <>
            <Head title={batchName} />

            <TopBar batchName={batchName} />

            <div className="space-y-5 px-8 pb-12">
                <TotalBalanceCard />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((m) => (
                        <MemberCard key={m.id} member={m} />
                    ))}
                </div>
            </div>
        </>
    );
}

MembersDashboard.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;