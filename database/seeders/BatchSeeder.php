<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;
use App\Services\RoundService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BatchSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the database with sample savings circles.
     */
    public function run(): void
    {
        $batches = [
            ['name' => 'Circle Alpha', 'status' => 'Active', 'contribution_sats' => 50_000_000, 'rounds_total' => 4, 'rounds_current' => 2],
            ['name' => 'Circle Beta', 'status' => 'Active', 'contribution_sats' => 60_000_000, 'rounds_total' => 6, 'rounds_current' => 4],
            ['name' => 'Circle Gamma', 'status' => 'Forming', 'contribution_sats' => 50_000_000, 'rounds_total' => 5, 'rounds_current' => 0],
            ['name' => 'Circle Delta', 'status' => 'Completed', 'contribution_sats' => 100_000_000, 'rounds_total' => 4, 'rounds_current' => 4],
        ];

        $wallets = [
            1 => 'bchtest:zp8alw3h8vuus3quxppmjcut877ceczpa59jxmd8ww',
            2 => 'bchtest:zrhgzfvws5f3a6mnqsl0cjyuw3vlrm4waqec7dcg27',
            3 => 'bchtest:zry3g9deul8vp4fyqzuq3x7hngpf5zf2xczcxts2pa',
            4 => 'bchtest:zqgw9f442zf2mtsn2lscmr2jeerz0tfkkgsq9mdqy9',
            5 => 'bchtest:zresm506jrgfhpcmwa8un7h2drt4yqzasctaq4ex07',
            6 => 'bchtest:zpx3892s45fq6mnmaseukd99va04shvypsv0qjqp0z',
        ];

        foreach ($batches as $batchData) {
            $batch = Batch::create($batchData);

            $roundsCurrent = $batchData['rounds_current'];

            for ($position = 1; $position <= $batchData['rounds_total']; $position++) {
                $member = Member::create([
                    'name' => 'Member '.$position,
                    'wallet' => $wallets[$position],
                ]);

                $batchMember = BatchMember::create([
                    'batch_id' => $batch->id,
                    'member_id' => $member->id,
                    'position' => $position,
                    'status' => $position <= $roundsCurrent ? 'Released' : 'Active',
                ]);

                for ($round = 1; $round <= $roundsCurrent; $round++) {
                    BatchContribution::create([
                        'batch_member_id' => $batchMember->id,
                        'round' => $round,
                        'amount_sats' => $batchData['contribution_sats'],
                    ]);
                }
            }

            try {
                $potAddress = app(RoundService::class)->batchPotAddress($batch);
                $batch->update(['pot_address' => $potAddress]);
            } catch (\Throwable $e) {
                // Pot wallet is derived deterministically from the batch id; a
                // failed derivation is backfilled on the first round advance.
            }
        }
    }
}
