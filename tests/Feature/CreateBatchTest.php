<?php

use App\Models\Batch;
use App\Models\Member;

it('creates a batch with members and their rotation positions', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Alpha',
        'contribution' => '0.5',
        'schedule' => 'monthly',
        'rotation' => 'fixed',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
            ['name' => 'Carol', 'wallet' => 'bchtest:cccc3'],
        ],
    ]);

    $response->assertRedirect(route('batches.show', $batch = Batch::where('name', 'Circle Alpha')->firstOrFail()));

    $batch = $batch->refresh();

    expect($batch->contribution_sats)->toBe(50_000_000);
    expect($batch->deposit_sats)->toBe(55_000_000);
    expect($batch->schedule)->toBe('monthly');
    expect($batch->rotation)->toBe('fixed');
    expect($batch->rounds_total)->toBe(3);
    expect($batch->status)->toBe('Forming');
    expect($batch->pot_address)->toStartWith('bchtest:');

    $pivots = $batch->batchMembers()->orderBy('position')->get();

    expect($pivots)->toHaveCount(3);
    expect($pivots->pluck('position')->all())->toBe([1, 2, 3]);
    expect($pivots[0]->member->name)->toBe('Alice');
    expect($pivots[1]->member->name)->toBe('Bob');
    expect($pivots[2]->member->name)->toBe('Carol');
    expect(Member::count())->toBe(3);
});

it('stores a random rotation batch', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Random',
        'contribution' => '1',
        'schedule' => 'weekly',
        'rotation' => 'random',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
        ],
    ]);

    $response->assertRedirect(route('batches.show', $batch = Batch::where('name', 'Circle Random')->firstOrFail()));

    expect($batch->rotation)->toBe('random');
    expect($batch->contribution_sats)->toBe(100_000_000);
    expect($batch->deposit_sats)->toBe(110_000_000);
});

it('rejects an unknown rotation mode', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Bad Rotation',
        'contribution' => '0.5',
        'schedule' => 'monthly',
        'rotation' => 'lottery',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
        ],
    ]);

    $response->assertSessionHasErrors('rotation');
    expect(Batch::count())->toBe(0);
});

it('rejects an invalid pay schedule', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Beta',
        'contribution' => '0.5',
        'schedule' => 'yearly',
        'rotation' => 'fixed',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => 'Bob', 'wallet' => 'bchtest:bbbb2'],
        ],
    ]);

    $response->assertSessionHasErrors('schedule');
    expect(Batch::count())->toBe(0);
});

it('requires a name for every member for transparency', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Circle Delta',
        'contribution' => '0.5',
        'schedule' => 'monthly',
        'rotation' => 'fixed',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:aaaa1'],
            ['name' => '', 'wallet' => 'bchtest:bbbb2'],
        ],
    ]);

    $response->assertSessionHasErrors('members.1.name');
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
