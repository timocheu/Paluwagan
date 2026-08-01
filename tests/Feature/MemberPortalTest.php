<?php

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;

it('shows the wallet registration screen', function () {
    $this->get(route('member.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('member/index')
            ->where('wallet', null));
});

it('binds a wallet to the session and redirects to the batch view', function () {
    $this->post(route('member.register'), ['wallet' => 'bchtest:abc123'])
        ->assertRedirect(route('member.batch'));

    expect(session('member_wallet'))->toBe('bchtest:abc123');
});

it('requires a wallet address to register', function () {
    $this->post(route('member.register'), [])
        ->assertSessionHasErrors('wallet');
});

it('redirects to registration when no wallet is bound', function () {
    $this->get(route('member.batch'))
        ->assertRedirect(route('member.index'));
});

it('lists only batches the session wallet participates in', function () {
    $wallet = 'bchtest:member1';
    $batch = Batch::factory()->active()->create(['rounds_total' => 3]);

    $mine = Member::factory()->create(['wallet' => $wallet]);
    BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $mine->id,
        'position' => 1,
    ]);

    $otherBatch = Batch::factory()->active()->create(['rounds_total' => 3]);
    $other = Member::factory()->create(['wallet' => 'bchtest:member2']);
    BatchMember::factory()->create([
        'batch_id' => $otherBatch->id,
        'member_id' => $other->id,
        'position' => 1,
    ]);

    $this->withSession(['member_wallet' => $wallet])
        ->get(route('member.batch'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('member/batch')
            ->where('wallet', $wallet)
            ->has('batches', 1)
            ->where('batches.0.batch.id', (string) $batch->id)
            ->where('batches.0.batch.name', $batch->name));
});

it('shows the batch from the member point of view', function () {
    $wallet = 'bchtest:member1';
    $batch = Batch::factory()->active()->create([
        'rounds_total' => 4,
        'rounds_current' => 2,
        'contribution_sats' => 50_000_000,
        'schedule' => 'daily',
        'rotation' => 'fixed',
        'pot_address' => 'bchtest:potwallet',
    ]);

    $member = Member::factory()->create(['wallet' => $wallet, 'name' => 'Alice']);
    $bm = BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $member->id,
        'position' => 2,
    ]);
    BatchContribution::factory()->create([
        'batch_member_id' => $bm->id,
        'round' => 1,
        'amount_sats' => 50_000_000,
        'tx_id' => str_repeat('b', 64),
    ]);

    $this->withSession(['member_wallet' => $wallet])
        ->get(route('member.batch'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('member/batch')
            ->where('wallet', $wallet)
            ->where('batches.0.batch.name', $batch->name)
            ->where('batches.0.batch.contributionAmount', '0.5 BCH')
            ->where('batches.0.batch.targetPayout', '0.5 BCH')
            ->where('batches.0.batch.potWallet', 'bchtest:potwallet')
            ->where('batches.0.batch.nextContributionDate', now()->addDay()->toDateString())
            ->where('batches.0.member.name', 'Alice')
            ->where('batches.0.member.saved', '0.5 BCH')
            ->where('batches.0.member.progress', 50)
            ->has('batches.0.contributions', 1)
            ->where('batches.0.contributions.0.round', 1)
            ->where('batches.0.contributions.0.amount', '0.5 BCH')
            ->has('batches.0.payoutRounds', 1)
            ->where('batches.0.payoutRounds.0.round', 2)
            ->where('batches.0.payoutRounds.0.paid', false));
});

it('forgets the session wallet', function () {
    $this->withSession(['member_wallet' => 'bchtest:abc123'])
        ->post(route('member.forget'))
        ->assertRedirect(route('member.index'));

    expect(session('member_wallet'))->toBeNull();
});

it('redirects a member-created batch back to their savings circles', function () {
    $wallet = 'bchtest:member1';

    $this->withSession(['member_wallet' => $wallet])
        ->post(route('batches.store'), [
            'name' => 'My Circle',
            'schedule' => 'monthly',
            'rotation' => 'fixed',
            'contribution' => '0.5',
            'members' => [
                ['name' => 'Me', 'wallet' => $wallet],
                ['name' => 'Friend', 'wallet' => 'bchtest:member2'],
            ],
        ])
        ->assertRedirect(route('member.batch'));

    $batch = Batch::where('name', 'My Circle')->firstOrFail();
    $member = Member::where('wallet', $wallet)->firstOrFail();

    expect($batch->batchMembers()->where('member_id', $member->id)->exists())->toBeTrue();
});

it('keeps the manager redirect when no member session exists', function () {
    $response = $this->post(route('batches.store'), [
        'name' => 'Manager Circle',
        'schedule' => 'monthly',
        'rotation' => 'fixed',
        'contribution' => '0.5',
        'members' => [
            ['name' => 'Alice', 'wallet' => 'bchtest:member1'],
        ],
    ])->assertRedirect();

    $location = $response->headers->get('Location');

    expect($location)->not->toContain('/member/');
});
