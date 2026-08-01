import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, KeyRound, Wallet } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { batch, forget, register } from '@/routes/member';

type Props = {
    wallet?: string | null;
};

export default function MemberIndex({ wallet }: Props) {
    return (
        <>
            <Head title="Member Portal" />

            <div className="flex min-h-screen items-center justify-center bg-[#F6F9FC] px-6">
                <div className="w-full max-w-md">
                    <Link
                        href="/"
                        className="mb-8 flex items-center justify-center gap-2"
                    >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#635BFF]">
                            <Wallet className="h-4 w-4 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-[#0A2540]">
                            Paluwagan
                        </span>
                    </Link>

                    <div className="rounded-2xl border border-[#0A2540]/10 bg-white p-8 shadow-sm">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#635BFF]/10">
                                <KeyRound className="h-5 w-5 text-[#635BFF]" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-[#0A2540]">
                                    Member Portal
                                </h1>
                                <p className="text-sm text-[#0A2540]/60">
                                    Track your savings circle
                                </p>
                            </div>
                        </div>

                        {wallet ? (
                            <div className="flex flex-col gap-5">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <p className="text-xs font-medium text-emerald-700">
                                        Registered wallet
                                    </p>
                                    <p className="mt-1 truncate font-mono text-sm font-medium text-emerald-900">
                                        {wallet}
                                    </p>
                                </div>

                                <Link
                                    href={batch()}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#635BFF] px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#635BFF]/90"
                                >
                                    View my batches
                                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                                </Link>

                                <Form action={forget()}>
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Switch wallet
                                    </Button>
                                </Form>
                            </div>
                        ) : (
                            <Form
                                action={register()}
                                className="flex flex-col gap-6"
                                disableWhileProcessing
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="wallet">
                                                Wallet address
                                            </Label>
                                            <Input
                                                id="wallet"
                                                name="wallet"
                                                type="text"
                                                required
                                                autoFocus
                                                placeholder="bchtest:q..."
                                            />
                                            <InputError message={errors.wallet} />
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Continue
                                        </Button>
                                    </>
                                )}
                            </Form>
                        )}

                        <p className="mt-6 text-center text-xs text-[#0A2540]/50">
                            No login required — your wallet is your identity.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
