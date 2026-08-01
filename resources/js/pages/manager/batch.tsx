import { Head, Link } from '@inertiajs/react';
import { Banknote, ChevronDown, Info, MoreHorizontal, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { CreateBatchDialog } from '@/components/ui/batches/create-batch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { index } from '@/routes/batches';

// Points at the batches.show route registered in routes/web.php.
// Swap for a Wayfinder helper (e.g. import { show } from '@/routes/batches') once
// batches are backed by a real model/controller.
const batchShowUrl = (id: string) => `/batches/${id}`;

type BatchStatus = 'Active' | 'Forming' | 'Completed';

interface Batch {
    id: string;
    name: string;
    memberCount: number;
    pot: string;
    round: { current: number; total: number };
    contributionProgress: number;
    status: BatchStatus;
}

const defaultBatches: Batch[] = [
    {
        id: 'circle-alpha',
        name: 'Circle Alpha',
        memberCount: 4,
        pot: '2.0 BCH',
        round: { current: 2, total: 4 },
        contributionProgress: 75,
        status: 'Active',
    },
    {
        id: 'circle-beta',
        name: 'Circle Beta',
        memberCount: 6,
        pot: '3.6 BCH',
        round: { current: 4, total: 6 },
        contributionProgress: 100,
        status: 'Active',
    },
    {
        id: 'circle-gamma',
        name: 'Circle Gamma',
        memberCount: 5,
        pot: '0 BCH',
        round: { current: 0, total: 5 },
        contributionProgress: 0,
        status: 'Forming',
    },
    {
        id: 'circle-delta',
        name: 'Circle Delta',
        memberCount: 4,
        pot: '4.0 BCH',
        round: { current: 4, total: 4 },
        contributionProgress: 100,
        status: 'Completed',
    },
];

function TopBar() {
    return (
        <div className="flex items-center justify-between px-8 pt-8 pb-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-[#0A2540]">
                    Batches
                </h2>
            </div>
            <div className="flex items-center gap-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2 font-normal">
                            <span className="h-5 w-6 rounded bg-[#635BFF]" />
                            •••• 6799
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>bchtest:qqvh6w...6799</DropdownMenuItem>
                        <DropdownMenuItem>bchtest:qzfx9j...2vqk</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <CreateBatchDialog />
            </div>
        </div>
    );
}

function TotalValueCard({ batches }: { batches: Batch[] }) {
    const activeCount = batches.filter((b) => b.status === 'Active').length;

    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardContent className="flex items-center justify-between p-6">
                <div>
                    <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total value locked
                        <Info className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-3xl font-semibold tracking-tight text-[#0A2540]">
                        9.6 BCH
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Across {batches.length} batches, {activeCount} active
                    </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#635BFF]/10">
                    <Banknote
                        className="h-5 w-5 text-[#635BFF]"
                        strokeWidth={1.75}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function statusBadgeClass(status: BatchStatus) {
    if (status === 'Active') {
        return 'text-emerald-700 bg-emerald-50';
    }

    if (status === 'Completed') {
        return 'text-neutral-600 bg-neutral-100';
    }

    return 'text-amber-700 bg-amber-50';
}

function BatchCard({ batch }: { batch: Batch }) {
    return (
        <Link href={batchShowUrl(batch.id)} className="group block">
            <Card className="rounded-2xl border-neutral-200 shadow-none transition-colors group-hover:border-neutral-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#635BFF]/10">
                            <Users className="h-4 w-4 text-[#635BFF]" strokeWidth={1.75} />
                        </div>
                        <p className="text-sm leading-none font-medium text-[#0A2540]">{batch.name}</p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5 pt-4">
                    <p className="text-xl font-semibold tracking-tight text-[#0A2540]">{batch.pot}</p>

                    <div className="space-y-2">
                        <Progress value={batch.contributionProgress} className="h-1.5" />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Round {batch.round.current} of {batch.round.total}
                            </span>
                            <span className="text-muted-foreground">{batch.contributionProgress}%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span>{batch.memberCount}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <Badge variant="secondary" className={`text-[11px] font-normal ${statusBadgeClass(batch.status)}`}>
                            {batch.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                            View members →
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function Batches({ batches = defaultBatches }: { batches?: Batch[] }) {
    return (
        <>
            <Head title="Batches" />

            <TopBar />

            <div className="space-y-5 px-8 pb-12">
                <TotalValueCard batches={batches} />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {batches.map((b) => (
                        <BatchCard key={b.id} batch={b} />
                    ))}
                </div>
            </div>
        </>
    );
}

Batches.layout = (page: ReactNode) => (
    <AppLayout
        breadcrumbs={[
            {
                title: 'Batches',
                href: index(),
            },
        ]}
    >
        {page}
    </AppLayout>
);