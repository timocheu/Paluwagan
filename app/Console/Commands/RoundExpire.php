<?php

namespace App\Console\Commands;

use App\Models\Batch;
use App\Services\RoundService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('round:expire {batch : Batch id or name}')]
#[Description('Simulate an expired round: the organizer reclaims the unclaimed pot on-chain')]
class RoundExpire extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(RoundService $rounds): int
    {
        $value = $this->argument('batch');
        $batch = Batch::where('id', $value)->orWhere('name', $value)->first();

        if ($batch === null) {
            $this->error("Batch '{$value}' not found.");

            return self::FAILURE;
        }

        try {
            $result = $rounds->expire($batch);

            $this->info("Round for {$batch->name} expired; pot reclaimed by organizer.");
            $this->line('Contract: '.$result['contractAddress']);
            $this->line('Reclaim tx: '.$result['txid']);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
    }
}
