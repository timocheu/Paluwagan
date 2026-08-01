import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    ChevronDown,
    Clock3,
    Info,
    MoreHorizontal,
    Plus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CreateMemberDialog } from '@/components/ui/batches/create-member';
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
import { advance, expire } from '@/routes/batches';

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

function TopBar({
    batchName,
    batchId,
}: {
    batchName: string;
    batchId: string;
}) {
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
                            <Button
                                variant="outline"
                                className="gap-2 font-normal"
                            >
                                <span className="h-5 w-6 rounded bg-emerald-600" />
                                •••• 6799
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                bchtest:qqvh6w...6799
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                bchtest:qzfx9j...2vqk
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <CreateMemberDialog batchId={batchId} />
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
                    <p className="text-3xl font-semibold tracking-tight">
                        2.0 BCH
                    </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                    <Banknote
                        className="h-5 w-5 text-emerald-600"
                        strokeWidth={1.75}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function RoundControls({
    batchId,
    rounds,
    batchStatus,
    potContract,
    flash,
}: {
    batchId: string;
    rounds: { current: number; total: number };
    batchStatus: string;
    potContract: string | null;
    flash?: { success?: string | null; error?: string | null };
}) {
    const completed = batchStatus === 'Completed';
    const [running, setRunning] = useState<'advance' | 'expire' | null>(null);

    const run = (action: 'advance' | 'expire') => {
        setRunning(action);
        router.post(
            action === 'advance'
                ? advance.url({ batch: Number(batchId) })
                : expire.url({ batch: Number(batchId) }),
            {},
            { preserveScroll: true, onFinish: () => setRunning(null) },
        );
    };

    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                    <p className="text-sm font-medium">
                        Round {rounds.current} of {rounds.total}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {completed
                            ? 'All rounds paid out.'
                            : `Rotation: ${batchStatus} · next recipient picked on-chain`}
                    </p>
                    {potContract && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            Pot contract: {potContract}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {!completed && (
                        <Button
                            variant="outline"
                            disabled={running !== null}
                            onClick={() => run('expire')}
                        >
                            {running === 'expire' ? 'Reclaiming...' : 'Expire round'}
                        </Button>
                    )}
                    <Button
                        disabled={completed || running !== null}
                        onClick={() => run('advance')}
                    >
                        {running === 'advance' ? 'Paying out...' : 'Simulate next round'}
                    </Button>
                </div>

                {flash?.error && (
                    <p className="w-full text-sm text-red-600">{flash.error}</p>
                )}
                {flash?.success && (
                    <p className="w-full text-sm text-emerald-600">{flash.success}</p>
                )}
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
                        <p className="text-sm leading-none font-medium">
                            {member.name}
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {member.address}
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="-mr-1.5 h-7 w-7">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-4">
                <p className="text-xl font-semibold tracking-tight">
                    {member.contribution}
                </p>

                <div className="space-y-2">
                    <Progress value={member.progress} className="h-1.5" />
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            <span className="font-medium">{member.saved}</span>{' '}
                            <span className="text-muted-foreground">
                                contributed
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            {member.percent}%
                        </span>
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
    batchId = '',
    batchName = 'Circle Alpha',
    members = defaultMembers,
    rounds = { current: 0, total: 0 },
    batchStatus = 'Forming',
    potContract = null,
    flash,
}: {
    batchId?: string;
    batchName?: string;
    members?: Member[];
    rounds?: { current: number; total: number };
    batchStatus?: string;
    potContract?: string | null;
    flash?: { success?: string | null; error?: string | null };
}) {
    return (
        <>
            <Head title={batchName} />

            <TopBar batchName={batchName} batchId={batchId} />

            <div className="space-y-5 px-8 pb-12">
                <TotalBalanceCard />

                <RoundControls
                    batchId={batchId}
                    rounds={rounds}
                    batchStatus={batchStatus}
                    potContract={potContract}
                    flash={flash}
                />

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
