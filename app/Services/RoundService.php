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
     * Advance the batch one round: every member contributes to the batch pot
     * wallet and the round recipient claims the pot on-chain.
     *
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string, potAddress: string, fundingTxid: string, contributions: array<int, array{position: int, amount: string, txid: string}>, recipientName: string}
     */
    public function advance(Batch $batch): array
    {
        if ($batch->status === 'Completed' || $batch->rounds_current >= $batch->rounds_total) {
            throw new RuntimeException('Batch has already completed all rounds.');
        }

        $round = $batch->rounds_current + 1;
        $recipient = $this->recipientForRound($batch, $round);

        $args = $this->workerArgs($batch, $recipient->position, 'advance');
        $result = $this->runWorker($args);
        $result['recipientName'] = $recipient->member->name ?? 'Member '.$recipient->position;

        $transactions = collect($result['contributions'])->keyBy('position');

        foreach ($batch->batchMembers as $batchMember) {
            BatchContribution::updateOrCreate(
                ['batch_member_id' => $batchMember->id, 'round' => $round],
                [
                    'amount_sats' => $batch->contribution_sats,
                    'tx_id' => $transactions[$batchMember->position]['txid'] ?? $result['txid'],
                ],
            );
        }

        $recipient->update(['status' => 'Released', 'payout_tx' => $result['txid']]);
        $batch->update([
            'rounds_current' => $round,
            'status' => $round >= $batch->rounds_total ? 'Completed' : 'Active',
            'contract_address' => $result['contractAddress'],
            'pot_address' => $batch->pot_address ?? $result['potAddress'],
            'last_payout_tx' => $result['txid'],
        ]);

        return $result;
    }

    /**
     * Evaluate an expired round so the organizer reclaims the unclaimed pot.
     *
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string, potAddress: string, fundingTxid: string, contributions: array<int, array{position: int, amount: string, txid: string}>}
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
            'pot_address' => $batch->pot_address ?? $result['potAddress'],
            'last_payout_tx' => $result['txid'],
        ]);

        return $result;
    }

    /**
     * Derive the deterministic pot wallet address for a batch. The address is
     * a function of the batch id, so it can always be recomputed server-side.
     */
    public function batchPotAddress(Batch $batch): string
    {
        $command = sprintf(
            'node %s --batch-wallet %d',
            escapeshellarg(base_path('contracts/src/worker.ts')),
            $batch->id,
        );

        $process = Process::run($command);

        if ($process->failed()) {
            $message = trim($process->errorOutput()) ?: trim($process->output());

            Log::error('Batch pot wallet derivation failed.', ['batchId' => $batch->id, 'message' => $message]);

            throw new RuntimeException("Pot wallet derivation failed: {$message}");
        }

        try {
            /** @var array{address: string} $data */
            $data = json_decode($process->output(), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new RuntimeException('Could not parse worker output.', 0, $e);
        }

        return $data['address'];
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
            'batchId' => $batch->id,
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
     * @return array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string, potAddress: string, fundingTxid: string, contributions: array<int, array{position: int, amount: string, txid: string}>}
     */
    private function runWorker(array $args): array
    {
        $command = sprintf(
            'node %s %s',
            escapeshellarg(base_path('contracts/src/worker.ts')),
            base64_encode(json_encode($args, JSON_THROW_ON_ERROR)),
        );

        // Symfony Process captures output in temporary files. When TMP/TEMP
        // are unset it falls back to the system directory (C:\WINDOWS), which
        // the web worker cannot write to, so point it at a writable location.
        $tempDir = storage_path('app/temp');
        $previous = ['TMP' => getenv('TMP'), 'TEMP' => getenv('TEMP')];

        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0777, true);
        }

        putenv('TMP='.$tempDir);
        putenv('TEMP='.$tempDir);

        try {
            $process = Process::run($command);
        } finally {
            foreach ($previous as $name => $value) {
                $value === false ? putenv($name) : putenv($name.'='.$value);
            }
        }

        if ($process->failed()) {
            $message = trim($process->errorOutput()) ?: trim($process->output());

            Log::error('Round worker failed.', ['args' => $args, 'message' => $message]);

            throw new RuntimeException("On-chain evaluation failed: {$message}");
        }

        try {
            /** @var array{contractAddress: string, txid: string, payoutAddress: string, pot: string, phase: string, potAddress: string, fundingTxid: string, contributions: array<int, array{position: int, amount: string, txid: string}>} $result */
            $result = json_decode($process->output(), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            throw new RuntimeException('Could not parse worker output.', 0, $e);
        }

        return $result;
    }
}
