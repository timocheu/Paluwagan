<?php

namespace App\Console\Commands;

use App\Models\Batch;
use App\Services\RoundService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('round:advance {batch : Batch id or name}')]
#[Description('Simulate the next round: members contribute and the recipient claims the pot on-chain')]
class RoundAdvance extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RoundService $rounds): int
    {
        $batch = $this->resolveBatch();

        if ($batch === null) {
            return self::FAILURE;
        }

        try {
            $result = $rounds->advance($batch);

            $this->info("Round {$batch->rounds_current} of {$batch->name} paid out.");
            $this->line('Contract: '.$result['contractAddress']);
            $this->line('Payout tx: '.$result['txid']);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }

    private function resolveBatch(): ?Batch
    {
        $value = $this->argument('batch');

        return Batch::where('id', $value)
            ->orWhere('name', $value)
            ->first();
    }
}
