<?php

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;
use App\Services\RoundService;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

function makeCircle(int $rounds = 3, string $rotation = 'fixed', string $schedule = 'daily'): Batch
{
    $batch = Batch::create([
        'name' => 'Circle '.Str::random(6),
        'schedule' => $schedule,
        'rotation' => $rotation,
        'contribution_sats' => 10_000_000,
        'rounds_total' => $rounds,
    ]);

    foreach (range(1, $rounds) as $position) {
        $member = Member::create([
            'name' => "Member {$position}",
            'wallet' => 'bchtest:'.Str::random(42),
        ]);

        $batch->batchMembers()->create([
            'member_id' => $member->id,
            'position' => $position,
        ]);
    }

    return $batch->fresh();
}

it('advances a round and records contributions on-chain', function () {
    $batch = makeCircle();
    $service = app(RoundService::class);

    $result = $service->advance($batch);

    expect($result['txid'])->toBeString()->toMatch('/^[a-f0-9]{64}$/');
    expect($result['contractAddress'])->toStartWith('bchtest:');

    $batch = $batch->fresh();

    expect($batch->rounds_current)->toBe(1);
    expect($batch->status)->toBe('Active');
    expect($batch->contract_address)->toBe($result['contractAddress']);
    expect($batch->last_payout_tx)->toBe($result['txid']);

    expect(BatchContribution::where('round', 1)->count())->toBe(3);
    expect(BatchContribution::where('round', 1)->pluck('amount_sats')->all())
        ->toBe([10_000_000, 10_000_000, 10_000_000]);

    $released = BatchMember::where('batch_id', $batch->id)->where('status', 'Released')->get();
    expect($released)->toHaveCount(1);
    expect($released[0]->position)->toBe(1);
});

it('advances round by round and completes the batch at the end', function () {
    $batch = makeCircle(rounds: 2);
    $service = app(RoundService::class);

    $service->advance($batch);
    $service->advance($batch);

    $batch = $batch->fresh();

    expect($batch->rounds_current)->toBe(2);
    expect($batch->status)->toBe('Completed');
    expect(BatchMember::where('batch_id', $batch->id)->where('status', 'Released')->count())->toBe(2);
});

it('refuses to advance a completed batch', function () {
    $batch = makeCircle(rounds: 1);
    $service = app(RoundService::class);

    $service->advance($batch);

    expect(fn () => $service->advance($batch->fresh()))
        ->toThrow(RuntimeException::class, 'completed');
});

it('evaluates an expired round so the organizer reclaims the pot', function () {
    $batch = makeCircle(rounds: 2);
    $service = app(RoundService::class);

    $result = $service->expire($batch);

    expect($result['phase'])->toBe('timeout');
    expect($result['txid'])->toMatch('/^[a-f0-9]{64}$/');

    $batch = $batch->fresh();

    expect($batch->last_payout_tx)->toBe($result['txid']);
    expect($batch->rounds_current)->toBe(0);
});

it('follows the shuffled payout order for random rotation', function () {
    $this->post(route('batches.store'), [
        'name' => 'Random Circle',
        'contribution' => '0.5',
        'schedule' => 'daily',
        'rotation' => 'random',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
            ['name' => 'Carol', 'wallet' => 'bchtest:cccc3'],
        ],
    ])->assertRedirect();

    $batch = Batch::where('name', 'Random Circle')->firstOrFail();
    $orders = $batch->batchMembers()->orderBy('position')->pluck('payout_order')->all();

    expect($orders)->toHaveCount(3);
    expect(array_unique($orders))->toHaveCount(3);
    expect(array_diff($orders, [1, 2, 3]))->toBe([]);

    $result = app(RoundService::class)->advance($batch);

    $claimed = $batch->batchMembers()->where('payout_order', 1)->first();
    expect($result['contractAddress'])->toStartWith('bchtest:');
    expect($claimed->status)->toBe('Released');
});

it('does not touch the database when the on-chain evaluation fails', function () {
    Process::fake(['*' => Process::result('', 'FailedRequireError: Not the round recipient', 1)]);

    $batch = makeCircle();
    $service = app(RoundService::class);

    expect(fn () => $service->advance($batch))
        ->toThrow(RuntimeException::class, 'On-chain evaluation failed');

    $batch = $batch->fresh();

    expect($batch->rounds_current)->toBe(0);
    expect(BatchContribution::count())->toBe(0);
    expect(BatchMember::where('status', 'Released')->count())->toBe(0);
});
