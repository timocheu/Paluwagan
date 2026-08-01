import { useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { FormEventHandler } from 'react';

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

export function CreateMemberDialog() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        wallet: '',
        auto_pay: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post('/members', {
            onSuccess: () => reset(),
        });
    };

    return (
        <Dialog>
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
                            Create member
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}