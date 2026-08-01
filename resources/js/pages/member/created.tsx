import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Layers, Users, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { forget } from '@/routes/member';

type CreatedBatch = {
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

type Props = {
    wallet: string;
    batches: CreatedBatch[];
};

function statusBadgeClass(status: string) {
    if (status === 'Active') {
        return 'text-emerald-700 bg-emerald-50';
    }

    if (status === 'Completed') {
        return 'text-neutral-600 bg-neutral-100';
    }

    return 'text-amber-700 bg-amber-50';
}

function CreatedBatchCard({ batch }: { batch: CreatedBatch }) {
    const progress = batch.cyclesTotal > 0
        ? Math.round((batch.cyclesCurrent / batch.cyclesTotal) * 100)
        : 0;

    return (
        <Link href={`/batches/${batch.id}`} className="group block">
            <Card className="rounded-2xl border-neutral-200 shadow-none transition-colors group-hover:border-neutral-300">
                <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#635BFF]/10">
                                <Users className="h-4 w-4 text-[#635BFF]" strokeWidth={1.75} />
                            </div>
                            <div>
                                <p className="text-sm leading-none font-medium text-[#0A2540]">
                                    {batch.name}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {batch.schedule} · {batch.rotation}
                                </p>
                            </div>
                        </div>
                        <Badge variant="secondary" className={`text-[11px] font-normal ${statusBadgeClass(batch.status)}`}>
                            {batch.status}
                        </Badge>
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">
                                Target payout
                            </p>
                            <p className="text-xl font-semibold tracking-tight text-[#0A2540]">
                                {batch.targetPayout}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                                Contribution
                            </p>
                            <p className="text-sm font-medium text-[#0A2540]">
                                {batch.contributionAmount}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Progress value={progress} className="h-1.5" />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Round {batch.cyclesCurrent} of {batch.cyclesTotal}
                            </span>
                            <span className="text-muted-foreground">{progress}%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <Layers className="h-4 w-4 text-[#635BFF]" strokeWidth={1.75} />
                            {batch.memberCount} members
                        </span>
                        <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <Wallet className="h-4 w-4 text-[#635BFF]" strokeWidth={1.75} />
                            {batch.contractStatus}
                        </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                            {batch.potWallet ?? 'Pot not deployed'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#635BFF] opacity-0 transition-opacity group-hover:opacity-100">
                            View batch
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function MemberCreated({ wallet, batches }: Props) {
    return (
        <>
            <Head title="My Batches" />

            <div className="space-y-5 px-8 pt-8 pb-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-[#0A2540]">
                            My Batches
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Batches created by your wallet.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                            {wallet}
                        </span>
                        <Form action={forget()}>
                            <button
                                type="submit"
                                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300"
                            >
                                Switch wallet
                            </button>
                        </Form>
                    </div>
                </div>

                {batches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white py-16 text-center">
                        <Users className="mx-auto h-10 w-10 text-neutral-300" strokeWidth={1.5} />
                        <h3 className="mt-4 text-lg font-semibold text-[#0A2540]">
                            No batches created yet
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create your first savings circle to get started.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {batches.map((batch) => (
                            <CreatedBatchCard key={batch.id} batch={batch} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
