import { useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
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

interface MemberInput {
    name: string;
    wallet: string;
}

export function CreateBatchDialog() {
    const { data, setData, post, processing, errors, reset } = useForm<{
        name: string;
        members: MemberInput[];
    }>({
        name: '',
        members: [{ name: '', wallet: '' }],
    });

    const updateMember = (index: number, field: keyof MemberInput, value: string) => {
        const members = data.members.map((member, i) => (i === index ? { ...member, [field]: value } : member));
        setData('members', members);
    };

    const addMember = () => {
        setData('members', [...data.members, { name: '', wallet: '' }]);
    };

    const removeMember = (index: number) => {
        setData(
            'members',
            data.members.filter((_, i) => i !== index),
        );
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/batches', {
            onSuccess: () => reset(),
        });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-neutral-900 hover:bg-neutral-800 cursor-pointer">
                    <Plus className="h-4 w-4" />
                    Create batch
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>Create batch</DialogTitle>
                        <DialogDescription>Set up a new rotating savings circle and add its members.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="batch-name">Batch name</Label>
                            <Input
                                id="batch-name"
                                placeholder="Circle Alpha"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label>Members</Label>
                            <div className="space-y-3">
                                {data.members.map((member, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <div className="grid flex-1 grid-cols-2 gap-2">
                                            <Input
                                                placeholder="Name (optional)"
                                                value={member.name}
                                                onChange={(e) => updateMember(index, 'name', e.target.value)}
                                            />
                                            <Input
                                                placeholder="Wallet address"
                                                value={member.wallet}
                                                onChange={(e) => updateMember(index, 'wallet', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 shrink-0 text-muted-foreground"
                                            onClick={() => removeMember(index)}
                                            disabled={data.members.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {errors.members && <p className="text-sm text-red-600">{errors.members}</p>}

                            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addMember}>
                                <Plus className="h-3.5 w-3.5" />
                                Add member
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" className="bg-neutral-900 hover:bg-neutral-800" disabled={processing}>
                            Create batch
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}