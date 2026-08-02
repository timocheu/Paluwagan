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
        $leaver->update(['status' => 'Left', 'continue_vote' => null]);

        BatchEvent::create([
            'batch_id' => $batch->id,
            'type' => 'claim',
            'from_name' => 'Batch Wallet',
            'to_name' => 'Organizer',
            'amount_sats' => $leaver->contributions->sum('amount_sats'),
            'txid' => $this->eventTxid($batch, 'claim'),
        ]);
    }

    private function stopAndRefund(Batch $batch, BatchMember $leaver): void
    {
        $batch->update(['status' => 'Stopped']);
        $leaver->update(['status' => 'Left', 'continue_vote' => null]);

        foreach ($batch->batchMembers as $bm) {
            $saved = $bm->contributions->sum('amount_sats');

            if ($saved === 0) {
                continue;
            }

            BatchEvent::create([
                'batch_id' => $batch->id,
                'type' => 'refund',
                'from_name' => 'Batch Wallet',
                'to_name' => $bm->member->name ?? 'Member '.$bm->position,
                'amount_sats' => $saved,
                'txid' => $this->eventTxid($batch, 'refund'.$bm->position),
            ]);
        }
    }

    private function eventTxid(Batch $batch, string $seed): string
    {
        return substr(hash('sha256', "batch{$batch->id}-{$seed}"), 0, 64);
    }
}
