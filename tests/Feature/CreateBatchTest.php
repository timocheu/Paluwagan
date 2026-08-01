<?php

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;

it('creates a batch with members and their rotation positions', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Alpha',
        'contribution' => '0.5',
        'schedule' => 'monthly',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => null, 'wallet' => 'bchtest:bbbb2'],
            ['name' => 'Carol', 'wallet' => 'bchtest:cccc3'],
        ],
    ]);

    $response->assertRedirect(route('batches.index'));

    $batch = Batch::where('name', 'Circle Alpha')->firstOrFail();

    expect($batch->contribution_sats)->toBe(50_000_000);
    expect($batch->schedule)->toBe('monthly');
    expect($batch->rounds_total)->toBe(3);
    expect($batch->status)->toBe('Forming');

    $pivots = $batch->batchMembers()->orderBy('position')->get();

    expect($pivots)->toHaveCount(3);
    expect($pivots->pluck('position')->all())->toBe([1, 2, 3]);
    expect($pivots[0]->member->name)->toBe('Alice');
    expect($pivots[1]->member->name)->toBeNull();
    expect($pivots[2]->member->name)->toBe('Carol');
    expect(Member::count())->toBe(3);
});

it('rejects an invalid pay schedule', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Beta',
        'contribution' => '0.5',
        'schedule' => 'yearly',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
        ],
    ]);

    $response->assertSessionHasErrors('schedule');
    expect(Batch::count())->toBe(0);
});

it('requires a contribution amount and at least two members', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Gamma',
        'contribution' => '',
        'schedule' => 'weekly',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
        ],
    ]);

    $response->assertSessionHasErrors(['contribution', 'members']);
    expect(Batch::count())->toBe(0);
});
