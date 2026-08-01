<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;
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

        foreach ($batches as $batchData) {
            $batch = Batch::create($batchData);

            $roundsCurrent = $batchData['rounds_current'];

            for ($position = 1; $position <= $batchData['rounds_total']; $position++) {
                $member = Member::create([
                    'name' => 'Member '.$position,
                    'wallet' => 'bchtest:'.fake()->unique()->regexify('[a-z0-9]{42}'),
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
        }
    }
}
