import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    Check,
    ChevronDown,
    Copy,
    FileText,
    Info,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Amount } from '@/components/amount';
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
import AppLayout from '@/layouts/app-layout';
import { advance, expire, index, show } from '@/routes/batches';

type MemberStatus = 'Released' | 'Active' | 'Slashed' | 'Leaving' | 'Left';

interface BatchInfo {
    contributionModel: string;
    contributionAmount: string;
    targetPayout: string;
    schedule: string;
    rotation: string;
    memberCount: number;
    cyclesTotal: number;
    cyclesCurrent: number;
    nextContributionDate: string | null;
    contractStatus: string;
}

const defaultBatchInfo: BatchInfo = {
    contributionModel: 'Fixed Contribution',
    contributionAmount: '0.5 BCH',
    targetPayout: '2 BCH',
    schedule: 'Monthly',
    rotation: 'Fixed Order',
    memberCount: 4,
    cyclesTotal: 4,
    cyclesCurrent: 2,
    nextContributionDate: 'Round 3',
    contractStatus: 'Active',
};

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

function WalletAddress({ address }: { address: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 1000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
            {address.slice(0, 6)}...
            {address.slice(-4)}
            {copied ? (
                <>
                    <Check className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                </>
            ) : (
                <Copy className="h-3 w-3" />
            )}
        </button>
    );
}

function Txid({ txid }: { txid: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(txid);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 1000);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={txid}
            aria-label="Copy transaction id"
            className="inline-flex items-center gap-1 font-mono text-xs whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
        >
            {txid.slice(0, 8)}...
            {txid.slice(-8)}
            {copied ? (
                <Check className="h-3 w-3 shrink-0 text-green-600" />
            ) : (
                <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
            )}
        </button>
    );
}

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
                href={index()}
                className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Batches
            </Link>
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-[#0A2540]">
                    {batchName}
                </h2>
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="gap-2 font-normal"
                            >
                                <span className="h-5 w-6 rounded bg-[#635BFF]" />
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

function TotalBalanceCard({ total }: { total: number }) {
    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardContent className="flex items-center justify-between p-6">
                <div>
                    <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                        Total pot balance
                        <Info className="h-3.5 w-3.5" />
                    </div>

                    <p className="text-3xl font-semibold tracking-tight text-[#0A2540]">
                        <Amount value={`${total.toFixed(2)} BCH`} />
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

function RoundControls({
    batchId,
    rounds,
    batchStatus,
    potContract,
    potWallet,
    flash,
}: {
    batchId: string;
    rounds: { current: number; total: number };
    batchStatus: string;
    potContract: string | null;
    potWallet: string | null;
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
                    {potWallet && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                            Pot wallet: {potWallet}
                        </p>
                    )}
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
                            {running === 'expire'
                                ? 'Reclaiming...'
                                : 'Expire round'}
                        </Button>
                    )}
                    <Button
                        disabled={completed || running !== null}
                        onClick={() => run('advance')}
                    >
                        {running === 'advance'
                            ? 'Paying out...'
                            : 'Simulate next round'}
                    </Button>
                </div>

                {flash?.error && (
                    <p className="w-full text-sm text-red-600">{flash.error}</p>
                )}
                {flash?.success && (
                    <p className="w-full text-sm text-emerald-600">
                        {flash.success}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function BatchInformation({ info }: { info: BatchInfo }) {
    const rows: Array<{
        label: string;
        value: string | number;
        currency?: boolean;
    }> = [
        { label: 'Contribution Model', value: info.contributionModel },
        {
            label: 'Contribution Amount',
            value: info.contributionAmount,
            currency: true,
        },
        { label: 'Target Payout', value: info.targetPayout, currency: true },
        { label: 'Contribution Schedule', value: info.schedule },
        { label: 'Payout Order', value: info.rotation },
        { label: 'Members', value: info.memberCount },
        { label: 'Total Cycles', value: info.cyclesTotal },
        { label: 'Current Cycle', value: info.cyclesCurrent },
        {
            label: 'Next Contribution Date',
            value: info.nextContributionDate ?? '—',
        },
        { label: 'Smart Contract Status', value: info.contractStatus },
    ];

    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between p-5 pb-3">
                <div>
                    <h3 className="text-lg font-semibold">Batch Information</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Configuration and on-chain status for this batch
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {}}
                >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    View Contract PDF
                </Button>
            </CardHeader>
            <CardContent className="p-5 pt-0">
                <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rows.map((row) => (
                        <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-4 border-b border-neutral-100 pb-2"
                        >
                            <dt className="text-sm text-muted-foreground">
                                {row.label}
                            </dt>
                            <dd className="text-sm font-medium text-[#0A2540]">
                                {row.currency ? (
                                    <Amount value={String(row.value)} />
                                ) : (
                                    row.value
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            </CardContent>
        </Card>
    );
}

function MemberStatusBadge({ status }: { status: MemberStatus }) {
    const styles: Record<string, string> = {
        Leaving: 'border-amber-200 bg-amber-50 text-amber-700',
        Left: 'border-red-200 bg-red-50 text-red-700',
        Slashed: 'border-red-200 bg-red-50 text-red-700',
        Released: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        Active: 'border-blue-200 bg-blue-50 text-blue-700',
    };

    return (
        <Badge
            className={
                styles[status] ?? 'border-gray-200 bg-gray-50 text-gray-700'
            }
        >
            {status}
        </Badge>
    );
}

function MemberCard({ member }: { member: Member }) {
    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-0">
                <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-[#635BFF]/10 font-mono text-[11px] text-[#635BFF]">
                            {member.id}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="text-sm leading-none font-medium text-[#0A2540]">
                            {member.name}
                        </p>
                        <WalletAddress address={member.address} />
                    </div>
                </div>
                <MemberStatusBadge status={member.status} />
            </CardHeader>

            <CardContent className="space-y-4 p-5 pt-4">
                <p className="text-xl font-semibold tracking-tight text-[#0A2540]">
                    <Amount value={member.contribution} />
                </p>

                <div className="space-y-2">
                    <Progress value={member.progress} className="h-1.5" />
                    <div className="flex items-center justify-between text-sm">
                        <span>
                            <Amount
                                value={member.saved}
                                subClassName="text-muted-foreground"
                            />{' '}
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
                    <span>
                        <Amount
                            value={member.remaining}
                            subClassName="text-muted-foreground"
                        />
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Commitment deposit
                    </span>
                    <span className="text-right">
                        <Amount
                            value={member.saved}
                            subClassName="text-muted-foreground"
                        />
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

type TransactionType = 'contribution' | 'payout' | 'claim' | 'refund';

interface Transaction {
    txid: string;
    from: string;
    to: string;
    amount: string;
    round: number;
    type: TransactionType;
}

function TransactionLog({ transactions }: { transactions: Transaction[] }) {
    const rowClass = (type: TransactionType) =>
        type === 'payout' || type === 'claim'
            ? 'bg-emerald-50/60 transition-colors hover:bg-emerald-100/80'
            : 'bg-red-50/60 transition-colors hover:bg-red-100/80';

    return (
        <Card className="rounded-2xl border-neutral-200 shadow-none">
            <CardHeader className="p-5 pb-3">
                <h3 className="text-lg font-semibold">Transaction History</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    All transactions for this wallet
                </p>
            </CardHeader>
            <CardContent className="p-5 pt-0">
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-neutral-100">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-neutral-50 text-left text-xs tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th className="px-4 py-3 font-medium">Txid</th>
                                <th className="px-4 py-3 font-medium">From</th>
                                <th className="px-4 py-3 font-medium">
                                    Amount
                                </th>
                                <th className="px-4 py-3 font-medium">Round</th>
                                <th className="px-4 py-3 font-medium">To</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-8 text-center text-muted-foreground"
                                    >
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr
                                        key={`${tx.round}-${tx.type}-${tx.txid}`}
                                        className={rowClass(tx.type)}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Txid txid={tx.txid} />
                                        </td>
                                        <td className="px-4 py-3">{tx.from}</td>
                                        <td className="px-4 py-3 font-medium text-[#0A2540]">
                                            <Amount value={tx.amount} />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {tx.round > 0
                                                ? `Round ${tx.round}`
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">{tx.to}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
    potWallet = null,
    batchInfo = defaultBatchInfo,
    transactions = [],
    flash,
}: {
    batchId?: string;
    batchName?: string;
    members?: Member[];
    rounds?: { current: number; total: number };
    batchStatus?: string;
    potContract?: string | null;
    potWallet?: string | null;
    batchInfo?: BatchInfo;
    transactions?: Transaction[];
    flash?: { success?: string | null; error?: string | null };
}) {
    const totalPotBalance = members.reduce((total, member) => {
        const amount = parseFloat(member.saved.replace(' BCH', '')) || 0;

        return total + amount;
    }, 0);

    return (
        <>
            <Head title={batchName} />

            <TopBar batchName={batchName} batchId={batchId} />

            <div className="space-y-5 px-8 pb-12">
                <TotalBalanceCard total={totalPotBalance} />

                <div className="mt-5">
                    <BatchInformation info={batchInfo} />
                </div>

                <div className="mt-5">
                    <TransactionLog transactions={transactions} />
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-3">
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            {members.map((m) => (
                                <MemberCard key={m.id} member={m} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-5">
                        <RoundControls
                            batchId={batchId}
                            rounds={rounds}
                            batchStatus={batchStatus}
                            potContract={potContract}
                            potWallet={potWallet}
                            flash={flash}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

function MembersLayout({ children }: { children: ReactNode }) {
    const { batchName, batchId } = usePage().props as {
        batchName?: string;
        batchId?: number;
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Batches',
                    href: index(),
                },
                {
                    title: batchName ?? 'Batch',
                    href: show(batchId!),
                },
            ]}
        >
            {children}
        </AppLayout>
    );
}

MembersDashboard.layout = (page: ReactNode) => (
    <MembersLayout>{page}</MembersLayout>
);
