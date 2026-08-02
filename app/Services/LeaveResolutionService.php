<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\BatchEvent;
use App\Models\BatchMember;
use RuntimeException;

class LeaveResolutionService
{
    /**
     * Mark a member as leaving the batch and pause it until the remaining
     * members decide whether to continue without them.
     */
    public function initiateLeave(BatchMember $leaver): void
    {
        $batch = $leaver->batch;

        if ($leaver->status !== 'Active') {
            throw new RuntimeException('Only active members can leave the circle.');
        }

        if (! in_array($batch->status, ['Forming', 'Active'], true)) {
            throw new RuntimeException('This circle cannot be left in its current state.');
        }

        $batch->batchMembers()->update(['continue_vote' => null]);
        $leaver->update(['status' => 'Leaving']);
        $batch->update(['status' => 'Resolving']);
    }

    /**
     * Record a remaining member's decision. The first member to respond
     * resolves the pending leave: continue without the leaver (organizer
     * claims the slot and its deposits) or stop the batch and refund every
     * member's deposits.
     */
    public function vote(BatchMember $voter, bool $continue): void
    {
        $batch = $voter->batch;

        if ($batch->status !== 'Resolving') {
            throw new RuntimeException('There is no pending leave decision.');
        }

        if ($voter->status !== 'Active') {
            throw new RuntimeException('Only active members can vote.');
        }

        if ($voter->continue_vote !== null) {
            throw new RuntimeException('You have already voted.');
        }

        $voter->update(['continue_vote' => $continue]);

        $this->resolve($batch);
    }

    private function resolve(Batch $batch): void
    {
        $batch->load('batchMembers.member', 'batchMembers.contributions');

        $leaver = $batch->batchMembers->firstWhere('status', 'Leaving');

        if ($leaver === null) {
            throw new RuntimeException('No leaving member found for this decision.');
        }

        $decision = $batch->batchMembers
            ->first(fn (BatchMember $bm) => $bm->continue_vote !== null);

        if ($decision !== null && $decision->continue_vote) {
            $this->continueWithout($batch, $leaver);

            return;
        }

        $this->stopAndRefund($batch, $leaver);
    }

    private function continueWithout(Batch $batch, BatchMember $leaver): void
    {
        $batch->update(['status' => 'Active']);
        $leaver->update(['status' => 'Left', 'continue_vote' => null, 'deposit_returned' => true]);

        BatchEvent::create([
            'batch_id' => $batch->id,
            'type' => 'claim',
            'from_name' => 'Batch Wallet',
            'to_name' => 'Organizer',
            'amount_sats' => $batch->depositSats(),
            'txid' => $this->eventTxid($batch, 'claim'),
        ]);
    }

    private function stopAndRefund(Batch $batch, BatchMember $leaver): void
    {
        $batch->update(['status' => 'Stopped']);
        $leaver->update(['continue_vote' => null]);

        foreach ($batch->batchMembers as $bm) {
            if ($bm->deposit_returned) {
                continue;
            }

            $bm->update(['status' => 'Left', 'deposit_returned' => true]);

            BatchEvent::create([
                'batch_id' => $batch->id,
                'type' => 'refund',
                'from_name' => 'Batch Wallet',
                'to_name' => $bm->member->name ?? 'Member '.$bm->position,
                'amount_sats' => $batch->depositSats(),
                'txid' => $this->eventTxid($batch, 'refund'.$bm->position),
            ]);
        }
    }

    /**
     * Manager-facing simulation: a member quits and the organizer takes over
     * their slot, claiming the member's commitment deposit.
     */
    public function simulateQuit(Batch $batch): string
    {
        if (! in_array($batch->status, ['Forming', 'Active'], true)) {
            throw new RuntimeException('This circle cannot simulate a quit in its current state.');
        }

        $leaver = $batch->batchMembers()
            ->where('status', 'Active')
            ->orderBy('position')
            ->first();

        if ($leaver === null) {
            throw new RuntimeException('No active member is available to quit.');
        }

        $leaver->load('member');

        $leaver->update(['status' => 'Left', 'deposit_returned' => true]);
        $batch->update(['status' => 'Active']);

        BatchEvent::create([
            'batch_id' => $batch->id,
            'type' => 'claim',
            'from_name' => 'Batch Wallet',
            'to_name' => 'Organizer',
            'amount_sats' => $batch->depositSats(),
            'txid' => $this->eventTxid($batch, 'simulated-quit'),
        ]);

        return $leaver->member->name ?? 'Member '.$leaver->position;
    }

    /**
     * Manager-facing simulation: the members decide to end the circle, so the
     * batch stops and every member gets their deposits back.
     */
    public function simulateStop(Batch $batch): void
    {
        if (in_array($batch->status, ['Completed', 'Stopped'], true)) {
            throw new RuntimeException('This circle is already finished.');
        }

        $batch->load('batchMembers.member');
        $batch->update(['status' => 'Stopped']);

        foreach ($batch->batchMembers as $bm) {
            if ($bm->deposit_returned) {
                continue;
            }

            $bm->update(['status' => 'Left', 'deposit_returned' => true]);

            BatchEvent::create([
                'batch_id' => $batch->id,
                'type' => 'refund',
                'from_name' => 'Batch Wallet',
                'to_name' => $bm->member->name ?? 'Member '.$bm->position,
                'amount_sats' => $batch->depositSats(),
                'txid' => $this->eventTxid($batch, 'simulated-stop'.$bm->position),
            ]);
        }
    }

    /**
     * Manager-facing simulation: a member quits and the organizer does not
     * fill the slot, so the leaver's deposit is split evenly among the
     * remaining members and everyone gets their own deposit back.
     */
    public function simulateSplit(Batch $batch): string
    {
        if (! in_array($batch->status, ['Forming', 'Active'], true)) {
            throw new RuntimeException('This circle cannot simulate a quit in its current state.');
        }

        $batch->load('batchMembers.member');

        $leaver = $batch->batchMembers
            ->first(fn (BatchMember $bm) => $bm->status === 'Active');

        if ($leaver === null) {
            throw new RuntimeException('No active member is available to quit.');
        }

        $remaining = $batch->batchMembers
            ->where('status', 'Active')
            ->reject(fn (BatchMember $bm) => $bm->id === $leaver->id)
            ->values();

        if ($remaining->isEmpty()) {
            throw new RuntimeException('No remaining members to split the deposit with.');
        }

        $deposit = $batch->depositSats();
        $share = intdiv($deposit, $remaining->count());
        $remainder = $deposit - ($share * $remaining->count());

        $leaver->update(['status' => 'Left', 'deposit_returned' => true]);
        $batch->update(['status' => 'Stopped']);

        $leaverName = $leaver->member->name ?? 'Member '.$leaver->position;

        foreach ($remaining as $index => $bm) {
            $bm->update(['status' => 'Left', 'deposit_returned' => true]);

            BatchEvent::create([
                'batch_id' => $batch->id,
                'type' => 'split',
                'from_name' => $leaverName,
                'to_name' => $bm->member->name ?? 'Member '.$bm->position,
                'amount_sats' => $share + ($index === 0 ? $remainder : 0),
                'txid' => $this->eventTxid($batch, 'split'.$bm->position),
            ]);

            BatchEvent::create([
                'batch_id' => $batch->id,
                'type' => 'refund',
                'from_name' => 'Batch Wallet',
                'to_name' => $bm->member->name ?? 'Member '.$bm->position,
                'amount_sats' => $batch->depositSats(),
                'txid' => $this->eventTxid($batch, 'split-refund'.$bm->position),
            ]);
        }

        return $leaverName;
    }

    private function eventTxid(Batch $batch, string $seed): string
    {
        return substr(hash('sha256', "batch{$batch->id}-{$seed}"), 0, 64);
    }
}
