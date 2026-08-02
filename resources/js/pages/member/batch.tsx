import { Form, Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    CalendarClock,
    CircleCheck,
    CircleDashed,
    Layers,
    LogOut,
    RefreshCw,
    Users,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Amount } from '@/components/amount';
import { Badge } from '@/components/ui/badge';
import { CreateBatchDialog } from '@/components/ui/batches/create-batch';
import { forget } from '@/routes/member';
import { leave, resolve } from '@/routes/member/batches';

type BatchInfo = {
    id: string;
    name: string;
    status: string;
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
    potWallet: string | null;
};

type MemberInfo = {
    id: string;
    name: string;
    address: string;
    contribution: string;
    saved: string;
    progress: number;
    due: string;
    remaining: string;
    autoPay: boolean;
    status: string;
};

type LeaveInfo = {
    canLeave: boolean;
    pendingLeave: {
        leaverName: string;
        voted: boolean;
        isLeaver: boolean;
    };
};

type BatchView = {
    batch: BatchInfo;
    member: MemberInfo;
    leave: LeaveInfo;
    contributions: Array<{ round: number; amount: string; txid: string }>;
    payoutRounds: Array<{ round: number; paid: boolean }>;
};

type Props = {
    wallet: string;
    batches: BatchView[];
    flash?: { success?: string | null; error?: string | null };
};

function statusBadge(status: string) {
    const styles: Record<string, string> = {
        Active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        Completed: 'border-blue-200 bg-blue-50 text-blue-700',
        Expired: 'border-red-200 bg-red-50 text-red-700',
        Resolving: 'border-amber-200 bg-amber-50 text-amber-700',
        Stopped: 'border-red-200 bg-red-50 text-red-700',
    };

    return styles[status] ?? 'border-gray-200 bg-gray-50 text-gray-700';
}

function LeaveSection({
    batchId,
    batch,
    leaveInfo,
}: {
    batchId: string;
    batch: BatchInfo;
    leaveInfo: LeaveInfo;
}) {
    const [submitting, setSubmitting] = useState<
        'leave' | 'continue' | 'stop' | null
    >(null);

    const run = (action: 'leave' | 'continue' | 'stop') => {
        setSubmitting(action);
        router.post(
            action === 'leave'
                ? leave.url({ batch: Number(batchId) })
                : resolve.url({ batch: Number(batchId) }),
            action === 'leave' ? {} : { continue: action === 'continue' },
            { preserveScroll: true, onFinish: () => setSubmitting(null) },
        );
    };

    if (batch.status === 'Stopped') {
        return (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                    strokeWidth={2}
                />
                <div>
                    <p className="text-sm font-medium text-red-800">
                        This circle ended
                    </p>
                    <p className="mt-0.5 text-xs text-red-700">
                        Deposits have been returned to every member.
                    </p>
                </div>
            </div>
        );
    }

    if (leaveInfo.pendingLeave.isLeaver) {
        return (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                    strokeWidth={2}
                />
                <div>
                    <p className="text-sm font-medium text-amber-800">
                        Leave request sent
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                        Waiting for another member to decide whether to continue
                        without you.
                    </p>
                </div>
            </div>
        );
    }

    if (batch.status === 'Resolving') {
        if (leaveInfo.pendingLeave.voted) {
            return (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                        strokeWidth={2}
                    />
                    <div>
                        <p className="text-sm font-medium text-blue-800">
                            Decision recorded
                        </p>
                        <p className="mt-0.5 text-xs text-blue-700">
                            Waiting for another member to decide.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-medium text-amber-900">
                    {leaveInfo.pendingLeave.leaverName} wants to leave this
                    circle.
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                    Their deposits go to the organizer — or the circle ends and
                    everyone gets their deposits back.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => run('continue')}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {submitting === 'continue'
                            ? 'Deciding...'
                            : 'Continue without them'}
                    </button>
                    <button
                        type="button"
                        disabled={submitting !== null}
                        onClick={() => run('stop')}
                        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                        {submitting === 'stop'
                            ? 'Ending...'
                            : 'End circle & refund'}
                    </button>
                </div>
            </div>
        );
    }

    if (leaveInfo.canLeave) {
        return (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0A2540]/10 bg-[#F6F9FC] px-4 py-3">
                <p className="text-sm text-[#0A2540]/70">
                    Leaving the circle pauses it until another member decides
                    what happens.
                </p>
                <button
                    type="button"
                    disabled={submitting !== null}
                    onClick={() => run('leave')}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
                    {submitting === 'leave' ? 'Leaving...' : 'Leave circle'}
                </button>
            </div>
        );
    }

    return null;
}

function BatchSection({
    batch,
    member,
    leave: leaveInfo,
    contributions,
    payoutRounds,
}: BatchView) {
    return (
        <section className="rounded-2xl border border-[#0A2540]/10 bg-white p-6 lg:p-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-semibold tracking-tight text-[#0A2540]">
                            {batch.name}
                        </h2>
                        <Badge className={statusBadge(batch.status)}>
                            {batch.status}
                        </Badge>
                        <Badge className={statusBadge(batch.contractStatus)}>
                            {batch.contractStatus}
                        </Badge>
                    </div>
                    <p className="mt-2 text-sm text-[#0A2540]/60">
                        Member view — {batch.schedule}, {batch.rotation}
                    </p>
                </div>
            </div>

            <LeaveSection
                batchId={batch.id}
                batch={batch}
                leaveInfo={leaveInfo}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6 lg:col-span-2">
                    <h3 className="mb-5 text-lg font-semibold tracking-tight text-[#0A2540]">
                        My savings
                    </h3>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-sm text-[#0A2540]/60">
                                Saved so far
                            </p>
                            <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0A2540]">
                                <Amount value={member.saved} />
                            </p>
                        </div>
                        <span className="text-2xl font-semibold text-[#635BFF]">
                            {member.progress}%
                        </span>
                    </div>

                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#0A2540]/10">
                        <div
                            className="h-full rounded-full bg-[#635BFF]"
                            style={{ width: `${member.progress}%` }}
                        />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3">
                            <p className="text-xs text-[#0A2540]/60">
                                Position
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[#0A2540]">
                                Member {member.id}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3">
                            <p className="text-xs text-[#0A2540]/60">Status</p>
                            <p className="mt-1 text-lg font-semibold text-[#0A2540]">
                                {member.status}
                            </p>
                        </div>
                        <div className="rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3">
                            <p className="text-xs text-[#0A2540]/60">Due</p>
                            <p className="mt-1 text-lg font-semibold text-[#0A2540]">
                                {member.due}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-[#0A2540]/70">
                        <span className="inline-flex items-center gap-2">
                            <RefreshCw
                                className="h-4 w-4 text-[#635BFF]"
                                strokeWidth={2}
                            />
                            {member.autoPay
                                ? 'Auto-pay on'
                                : 'Manual contribution'}
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <Wallet
                                className="h-4 w-4 text-[#635BFF]"
                                strokeWidth={2}
                            />
                            <Amount
                                value={batch.contributionAmount}
                                subClassName="text-[#0A2540]/50"
                            />{' '}
                            / {batch.schedule.toLowerCase()}
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                    <h3 className="mb-5 text-lg font-semibold tracking-tight text-[#0A2540]">
                        Batch details
                    </h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-sm text-[#0A2540]/60">
                                <Layers className="h-4 w-4" strokeWidth={2} />
                                Cycle
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                {batch.cyclesCurrent} / {batch.cyclesTotal}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-sm text-[#0A2540]/60">
                                <Users className="h-4 w-4" strokeWidth={2} />
                                Members
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                {batch.memberCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#0A2540]/60">
                                Target payout
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                <Amount value={batch.targetPayout} />
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-sm text-[#0A2540]/60">
                                <CalendarClock
                                    className="h-4 w-4"
                                    strokeWidth={2}
                                />
                                Next contribution
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                {batch.nextContributionDate ?? '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-[#0A2540]/60">
                                Remaining due
                            </span>
                            <span className="text-sm font-semibold text-[#0A2540]">
                                <Amount value={member.remaining} />
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3">
                        <p className="text-xs text-[#0A2540]/60">Pot wallet</p>
                        <p className="mt-1 truncate font-mono text-xs text-[#0A2540]">
                            {batch.potWallet ?? '—'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                    <h3 className="mb-5 text-lg font-semibold tracking-tight text-[#0A2540]">
                        My contributions
                    </h3>

                    {contributions.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[#0A2540]/50">
                            No contributions recorded yet.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-[#0A2540]/5 text-xs text-[#0A2540]/50">
                                        <th className="py-2 pr-4 font-medium">
                                            Round
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Amount
                                        </th>
                                        <th className="py-2 font-medium">
                                            Transaction
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contributions.map((c) => (
                                        <tr
                                            key={c.round}
                                            className="border-b border-[#0A2540]/5 last:border-0"
                                        >
                                            <td className="py-3 pr-4 font-medium text-[#0A2540]">
                                                {c.round}
                                            </td>
                                            <td className="py-3 pr-4 text-[#0A2540]">
                                                <Amount
                                                    value={c.amount}
                                                    subClassName="text-[#0A2540]/50"
                                                />
                                            </td>
                                            <td className="py-3 font-mono text-xs text-[#0A2540]/60">
                                                {c.txid}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-[#0A2540]/5 bg-[#F6F9FC] p-6">
                    <h3 className="mb-5 text-lg font-semibold tracking-tight text-[#0A2540]">
                        My payouts
                    </h3>

                    {payoutRounds.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[#0A2540]/50">
                            Your payout round has not been drawn yet.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {payoutRounds.map((p) => (
                                <div
                                    key={p.round}
                                    className="flex items-center justify-between rounded-xl border border-[#0A2540]/5 bg-white px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        {p.paid ? (
                                            <CircleCheck
                                                className="h-5 w-5 text-emerald-500"
                                                strokeWidth={2}
                                            />
                                        ) : (
                                            <CircleDashed
                                                className="h-5 w-5 text-[#0A2540]/30"
                                                strokeWidth={2}
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-[#0A2540]">
                                                Round {p.round}
                                            </p>
                                            <p className="text-xs text-[#0A2540]/60">
                                                <Amount
                                                    value={batch.targetPayout}
                                                    subClassName="text-[#0A2540]/40"
                                                />{' '}
                                                pot
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-xs font-medium ${
                                            p.paid
                                                ? 'text-emerald-600'
                                                : 'text-[#0A2540]/50'
                                        }`}
                                    >
                                        {p.paid ? 'Paid' : 'Scheduled'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default function MemberBatch({ wallet, batches, flash }: Props) {
    return (
        <>
            <Head title="My Batches" />

            <div className="min-h-screen bg-[#F6F9FC] pb-16">
                <header className="border-b border-[#0A2540]/5 bg-white">
                    <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 lg:px-8">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#0A2540]/70 transition-colors hover:text-[#0A2540]"
                        >
                            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                            Home
                        </Link>
                        <div className="flex items-center gap-3">
                            <span className="hidden max-w-56 truncate font-mono text-xs text-[#0A2540]/60 sm:block">
                                {wallet}
                            </span>
                            <Form action={forget()}>
                                <button
                                    type="submit"
                                    className="rounded-lg border border-[#0A2540]/10 bg-white px-3 py-1.5 text-xs font-medium text-[#0A2540] transition-colors hover:border-[#0A2540]/20"
                                >
                                    Switch wallet
                                </button>
                            </Form>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-6 pt-10 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold tracking-tight text-[#0A2540]">
                                My savings circles
                            </h1>
                            <p className="mt-2 text-sm text-[#0A2540]/60">
                                Batches your wallet participates in.
                            </p>
                        </div>
                        <CreateBatchDialog />
                    </div>

                    {batches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#0A2540]/15 bg-white py-16 text-center">
                            <Users
                                className="mx-auto h-10 w-10 text-[#0A2540]/30"
                                strokeWidth={1.5}
                            />
                            <h2 className="mt-4 text-lg font-semibold text-[#0A2540]">
                                No batches yet
                            </h2>
                            <p className="mt-2 text-sm text-[#0A2540]/60">
                                This wallet is not part of any savings circle.
                                Ask your manager to add it.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {batches.map((view) => (
                                <BatchSection key={view.batch.id} {...view} />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
