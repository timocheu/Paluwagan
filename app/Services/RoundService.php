<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class RoundService
{
    /** Block heights the mock chain exposes; the round window sits around it. */
    private const MOCK_CHAIN_HEIGHT = 133700;

    /** How many blocks each pay interval lasts (approximate). */
    private const BLOCKS_PER_INTERVAL = [
        'monthly' => 4320,
        'weekly' => 1008,
        'daily' => 144,
    ];

    /**
     * Advance the batch one round: every member contributes and the round
     * recipient claims the pot on-chain.
     *
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string}
     */
    public function advance(Batch $batch): array
    {
        if ($batch->status === 'Completed' || $batch->rounds_current >= $batch->rounds_total) {
            throw new RuntimeException('Batch has already completed all rounds.');
        }

        $round = $batch->rounds_current + 1;
        $recipient = $this->recipientForRound($batch, $round);

        $args = $this->workerArgs($batch, $recipient->position, 'claim');
        $result = $this->runWorker($args);

        foreach ($batch->batchMembers as $batchMember) {
            BatchContribution::updateOrCreate(
                ['batch_member_id' => $batchMember->id, 'round' => $round],
                [
                    'amount_sats' => $batch->contribution_sats,
                    'tx_id' => $result['txid'],
                ],
            );
        }

        $recipient->update(['status' => 'Released']);
        $batch->update([
            'rounds_current' => $round,
            'status' => $round >= $batch->rounds_total ? 'Completed' : 'Active',
            'contract_address' => $result['contractAddress'],
            'last_payout_tx' => $result['txid'],
        ]);

        return $result;
    }

    /**
     * Evaluate an expired round so the organizer reclaims the unclaimed pot.
     *
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string}
     */
    public function expire(Batch $batch): array
    {
        if ($batch->status === 'Completed' || $batch->rounds_current >= $batch->rounds_total) {
            throw new RuntimeException('Batch has already completed all rounds.');
        }

        $round = $batch->rounds_current + 1;
        $recipient = $this->recipientForRound($batch, $round);

        $args = $this->workerArgs($batch, $recipient->position, 'timeout');
        $result = $this->runWorker($args);

        $batch->update([
            'contract_address' => $result['contractAddress'],
            'last_payout_tx' => $result['txid'],
        ]);

        return $result;
    }

    /**
     * Pick the round's recipient. Fixed rotation pays by membership position;
     * random rotation follows the shuffled payout order assigned at creation.
     */
    private function recipientForRound(Batch $batch, int $round): BatchMember
    {
        $recipient = null;

        if ($batch->rotation === 'random') {
            $recipient = $batch->batchMembers->firstWhere('payout_order', $round);
        }

        // Fall back to membership position when a random batch has no payout
        // order assigned (e.g. seeded or pre-existing data).
        $recipient ??= $batch->batchMembers->firstWhere('position', $round);

        if ($recipient === null) {
            throw new RuntimeException("No recipient assigned for round {$round}.");
        }

        return $recipient;
    }

    /**
     * Build the worker arguments for a single on-chain round evaluation.
     *
     * @return array<string, mixed>
     */
    private function workerArgs(Batch $batch, int $recipientPosition, string $phase): array
    {
        $startBlock = self::MOCK_CHAIN_HEIGHT;
        $deadline = $startBlock + (self::BLOCKS_PER_INTERVAL[$batch->schedule] ?? 4320);

        return [
            'recipientPosition' => $recipientPosition,
            'contributionSats' => (string) $batch->contribution_sats,
            'memberCount' => (string) $batch->batchMembers->count(),
            'startBlock' => (string) $startBlock,
            'deadline' => (string) $deadline,
            'phase' => $phase,
        ];
    }

    /**
     * Run the CashScript worker to evaluate the round on-chain and return its JSON result.
     *
     * @param  array<string, mixed>  $args
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string}
     */
    private function runWorker(array $args): array
    {
        $command = sprintf(
            'node %s %s',
            escapeshellarg(base_path('contracts/src/worker.ts')),
            escapeshellarg(json_encode($args, JSON_THROW_ON_ERROR)),
        );

        $process = Process::run($command);

        if ($process->failed()) {
            $message = trim($process->errorOutput()) ?: trim($process->output());

            Log::error('Round worker failed.', ['args' => $args, 'message' => $message]);

            throw new RuntimeException("On-chain evaluation failed: {$message}");
        }

        try {
            /** @var array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string} $result */
            $result = json_decode($process->output(), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new RuntimeException('Could not parse worker output.', 0, $e);
        }

        return $result;
    }
}
