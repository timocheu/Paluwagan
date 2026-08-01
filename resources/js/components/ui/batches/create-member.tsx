import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { store } from '@/routes/members';

export function CreateMemberDialog({ batchId }: { batchId: string }) {
    const [open, setOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        batch_id: batchId,
        name: '',
        wallet: '',
        auto_pay: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(store.url(), {
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-neutral-900 hover:bg-neutral-800 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Add member
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Create member</DialogTitle>
                        <DialogDescription>
                            Add a new member to the savings circle.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="member-name">
                                Member name
                            </Label>
                            <Input
                                id="member-name"
                                placeholder="John Doe"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-600">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="wallet-address">
                                Wallet address
                            </Label>
                            <Input
                                id="wallet-address"
                                placeholder="0x..."
                                value={data.wallet}
                                onChange={(e) => setData('wallet', e.target.value)}
                                required
                            />
                            {errors.wallet && (
                                <p className="text-sm text-red-600">
                                    {errors.wallet}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="auto-pay" className="flex flex-col space-y-1">
                                <span>Auto Pay</span>
                                <span className="font-normal text-xs text-muted-foreground">
                                    Automatically collect contributions when due.
                                </span>
                            </Label>
                            <Switch
                                id="auto-pay"
                                checked={data.auto_pay}
                                onCheckedChange={(checked) => setData('auto_pay', checked)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>

                        <Button
                            type="submit"
                            className="bg-neutral-900 hover:bg-neutral-800"
                            disabled={processing}
                        >
                            {processing ? 'Creating...' : 'Create member'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}