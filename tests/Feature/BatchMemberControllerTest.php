<?php

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;

it('lists batches with derived pot and progress', function () {
    $batch = Batch::factory()->active()->create([
        'rounds_total' => 4,
        'rounds_current' => 2,
        'contribution_sats' => 50_000_000,
    ]);

    $member = Member::factory()->create();
    $bm = BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id, 'position' => 1]);
    BatchContribution::factory()->create(['batch_member_id' => $bm->id, 'round' => 1, 'amount_sats' => 50_000_000]);
    BatchContribution::factory()->create(['batch_member_id' => $bm->id, 'round' => 2, 'amount_sats' => 50_000_000]);

    $response = $this->get(route('batches.index'));

    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('manager/batch')
        ->has('batches', 1)
        ->where('batches.0.name', $batch->name)
        ->where('batches.0.memberCount', 1)
        ->where('batches.0.pot', '1 BCH')
        ->where('batches.0.round', ['current' => 2, 'total' => 4])
        ->where('batches.0.contributionProgress', 50)
        ->where('batches.0.status', 'Active')
        ->where('totalValueLocked', '1 BCH'));
});

it('shows a batch with its members and balances', function () {
    $batch = Batch::factory()->active()->create([
        'rounds_total' => 4,
        'rounds_current' => 2,
        'contribution_sats' => 50_000_000,
    ]);

    $member = Member::factory()->create(['name' => 'Alice']);
    $bm = BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $member->id,
        'position' => 1,
        'payout_tx' => str_repeat('a', 64),
    ]);
    BatchContribution::factory()->create([
        'batch_member_id' => $bm->id,
        'round' => 1,
        'amount_sats' => 50_000_000,
        'tx_id' => str_repeat('b', 64),
    ]);

    $response = $this->get(route('batches.show', $batch));

    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('manager/members')
        ->where('batchName', $batch->name)
        ->has('members', 1)
        ->where('members.0.name', 'Alice')
        ->where('members.0.address', $member->wallet)
        ->where('members.0.contribution', '0.5 BCH')
        ->where('members.0.saved', '0.5 BCH')
        ->where('members.0.due', 'Round 2')
        ->where('members.0.remaining', '0.5 BCH')
        ->where('members.0.progress', 50)
        ->where('members.0.percent', 50)
        ->has('transactions', 2)
        ->where('transactions.0.type', 'payout')
        ->where('transactions.0.from', 'Batch Wallet')
        ->where('transactions.0.to', 'Alice')
        ->where('transactions.0.amount', '0.5 BCH')
        ->where('transactions.0.round', 1)
        ->where('transactions.1.type', 'contribution')
        ->where('transactions.1.from', 'Alice')
        ->where('transactions.1.to', 'Batch Wallet')
        ->where('transactions.1.amount', '0.5 BCH'));
});

it('lists real batches on the batches page', function () {
    $batch = Batch::factory()->active()->create(['name' => 'Circle Alpha']);

    $response = $this->get(route('batches.index'));

    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('manager/batch')
        ->has('batches', 1)
        ->where('batches.0.id', (string) $batch->id)
        ->where('batches.0.name', 'Circle Alpha'));
});

it('adds a member to a batch as the next position', function () {
    $batch = Batch::factory()->active()->create(['rounds_total' => 3]);
    $existing = Member::factory()->create();
    BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $existing->id, 'position' => 1]);

    $response = $this->post(route('members.store'), [
        'batch_id' => $batch->id,
        'name' => 'Bob',
        'wallet' => 'bchtest:bbbb2',
        'auto_pay' => true,
    ]);

    $response->assertRedirect(route('batches.show', $batch));

    $pivot = BatchMember::where('batch_id', $batch->id)->where('position', 2)->firstOrFail();

    expect($pivot->member->name)->toBe('Bob');
    expect($pivot->member->wallet)->toBe('bchtest:bbbb2');
    expect((bool) $pivot->auto_pay)->toBeTrue();
});

it('requires a batch when adding a member', function () {
    $this->post(route('members.store'), ['wallet' => 'bchtest:cccc3'])
        ->assertSessionHasErrors('batch_id');

    expect(Member::count())->toBe(0);
});
