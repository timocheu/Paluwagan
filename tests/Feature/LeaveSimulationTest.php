<?php

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchEvent;
use App\Models\BatchMember;
use App\Models\Member;

function makeLeaveCircle(string $leaverWallet = 'bchtest:leaver', string $voterWallet = 'bchtest:voter'): array
{
    $batch = Batch::factory()->active()->create([
        'rounds_total' => 2,
        'contribution_sats' => 50_000_000,
    ]);

    $leaver = Member::factory()->create(['wallet' => $leaverWallet, 'name' => 'Leaver']);
    $voter = Member::factory()->create(['wallet' => $voterWallet, 'name' => 'Voter']);

    $leaverBm = BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $leaver->id,
        'position' => 1,
    ]);
    $voterBm = BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $voter->id,
        'position' => 2,
    ]);

    BatchContribution::factory()->create([
        'batch_member_id' => $leaverBm->id,
        'round' => 1,
        'amount_sats' => 50_000_000,
    ]);
    BatchContribution::factory()->create([
        'batch_member_id' => $voterBm->id,
        'round' => 1,
        'amount_sats' => 50_000_000,
    ]);

    return ['batch' => $batch, 'leaver' => $leaverBm, 'voter' => $voterBm];
}

it('pauses the batch when a member asks to leave', function () {
    ['batch' => $batch, 'leaver' => $leaver] = makeLeaveCircle();

    $this->withSession(['member_wallet' => 'bchtest:leaver'])
        ->post(route('member.batches.leave', $batch))
        ->assertRedirect();

    expect($batch->fresh()->status)->toBe('Resolving');
    expect($leaver->fresh()->status)->toBe('Leaving');
    expect($batch->fresh()->batchMembers()->whereNotNull('continue_vote')->count())->toBe(0);
});

it('lets the first member continue without the leaver and credits the organizer', function () {
    ['batch' => $batch, 'leaver' => $leaver] = makeLeaveCircle();

    $this->withSession(['member_wallet' => 'bchtest:leaver'])
        ->post(route('member.batches.leave', $batch));

    $this->withSession(['member_wallet' => 'bchtest:voter'])
        ->post(route('member.batches.resolve', $batch), ['continue' => true])
        ->assertRedirect();

    expect($batch->fresh()->status)->toBe('Active');
    expect($leaver->fresh()->status)->toBe('Left');
    expect($leaver->fresh()->deposit_returned)->toBeTrue();

    $claim = BatchEvent::where('batch_id', $batch->id)->where('type', 'claim')->first();
    expect($claim)->not->toBeNull();
    expect($claim->to_name)->toBe('Organizer');
    expect($claim->amount_sats)->toBe(55_000_000);
    expect($claim->txid)->toBe(substr(hash('sha256', "batch{$batch->id}-claim"), 0, 64));

    expect(BatchEvent::where('batch_id', $batch->id)->where('type', 'refund')->count())->toBe(0);
});

it('stops the batch and refunds every member when the decision is to end', function () {
    ['batch' => $batch, 'leaver' => $leaver] = makeLeaveCircle();

    $this->withSession(['member_wallet' => 'bchtest:leaver'])
        ->post(route('member.batches.leave', $batch));

    $this->withSession(['member_wallet' => 'bchtest:voter'])
        ->post(route('member.batches.resolve', $batch), ['continue' => false])
        ->assertRedirect();

    expect($batch->fresh()->status)->toBe('Stopped');
    expect($leaver->fresh()->status)->toBe('Left');

    $refunds = BatchEvent::where('batch_id', $batch->id)->where('type', 'refund')->get();
    expect($refunds)->toHaveCount(2);
    expect($refunds->pluck('amount_sats')->all())->toBe([55_000_000, 55_000_000]);
    expect($refunds->pluck('to_name')->all())->toBe(['Leaver', 'Voter']);

    expect($batch->fresh()->batchMembers()->where('deposit_returned', true)->count())->toBe(2);
});

it('rejects a leave request from a released member', function () {
    ['batch' => $batch, 'leaver' => $leaver] = makeLeaveCircle();
    $leaver->update(['status' => 'Released']);

    $this->withSession(['member_wallet' => 'bchtest:leaver'])
        ->post(route('member.batches.leave', $batch))
        ->assertRedirect()
        ->assertSessionHasErrors('leave');

    expect($batch->fresh()->status)->toBe('Active');
});

it('rejects a vote when the batch is not resolving', function () {
    ['batch' => $batch] = makeLeaveCircle();

    $this->withSession(['member_wallet' => 'bchtest:voter'])
        ->post(route('member.batches.resolve', $batch), ['continue' => true])
        ->assertRedirect()
        ->assertSessionHasErrors('leave');
});

it('redirects to registration when no wallet is bound', function () {
    $batch = Batch::factory()->active()->create();

    $this->post(route('member.batches.leave', $batch))
        ->assertRedirect(route('member.index'));

    $this->post(route('member.batches.resolve', $batch), ['continue' => true])
        ->assertRedirect(route('member.index'));
});

it('ignores wallets that are not part of the batch', function () {
    ['batch' => $batch] = makeLeaveCircle();

    $this->withSession(['member_wallet' => 'bchtest:stranger'])
        ->post(route('member.batches.leave', $batch))
        ->assertRedirect(route('member.batch'));

    expect($batch->fresh()->status)->toBe('Active');
});

it('splits the leaver deposit among members when the organizer does not fill in', function () {
    ['batch' => $batch, 'leaver' => $leaver, 'voter' => $voter] = makeLeaveCircle();

    $this->post(route('batches.simulateSplit', $batch))
        ->assertRedirect(route('batches.show', $batch))
        ->assertSessionHas('success');

    expect($batch->fresh()->status)->toBe('Stopped');
    expect($leaver->fresh()->status)->toBe('Left');
    expect($leaver->fresh()->deposit_returned)->toBeTrue();
    expect($voter->fresh()->status)->toBe('Left');
    expect($voter->fresh()->deposit_returned)->toBeTrue();

    $split = BatchEvent::where('batch_id', $batch->id)->where('type', 'split')->get();
    expect($split)->toHaveCount(1);
    expect($split[0]->from_name)->toBe('Leaver');
    expect($split[0]->to_name)->toBe('Voter');
    expect($split[0]->amount_sats)->toBe(55_000_000);
    expect($split[0]->txid)->toBe(substr(hash('sha256', "batch{$batch->id}-split2"), 0, 64));

    $refunds = BatchEvent::where('batch_id', $batch->id)->where('type', 'refund')->get();
    expect($refunds)->toHaveCount(1);
    expect($refunds[0]->amount_sats)->toBe(55_000_000);
    expect($refunds[0]->to_name)->toBe('Voter');

    $this->get(route('batches.show', $batch))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members.0.deposit', '0 BCH')
            ->where('members.1.deposit', '0 BCH'));
});

it('lists leave events in the manager transaction ledger', function () {
    ['batch' => $batch, 'leaver' => $leaver] = makeLeaveCircle();

    BatchEvent::factory()->create([
        'batch_id' => $batch->id,
        'type' => 'claim',
        'to_name' => 'Organizer',
        'amount_sats' => 55_000_000,
        'txid' => str_repeat('c', 64),
    ]);

    $response = $this->get(route('batches.show', $batch));

    $response->assertOk()->assertInertia(fn ($page) => $page
        ->component('manager/members')
        ->has('transactions', 3)
        ->where('transactions.0.type', 'claim')
        ->where('transactions.0.from', 'Batch Wallet')
        ->where('transactions.0.to', 'Organizer')
        ->where('transactions.0.amount', '0.55 BCH')
        ->where('transactions.0.round', 0)
        ->where('members.0.deposit', '0.55 BCH')
        ->where('members.1.deposit', '0.55 BCH'));
});

it('simulates a member quitting and the organizer claiming their deposit', function () {
    ['batch' => $batch, 'leaver' => $leaver, 'voter' => $voter] = makeLeaveCircle();

    $this->post(route('batches.simulateQuit', $batch))
        ->assertRedirect(route('batches.show', $batch))
        ->assertSessionHas('success');

    expect($batch->fresh()->status)->toBe('Active');
    expect($leaver->fresh()->status)->toBe('Left');
    expect($leaver->fresh()->deposit_returned)->toBeTrue();
    expect($voter->fresh()->status)->toBe('Active');

    $claim = BatchEvent::where('batch_id', $batch->id)->where('type', 'claim')->first();
    expect($claim)->not->toBeNull();
    expect($claim->to_name)->toBe('Organizer');
    expect($claim->amount_sats)->toBe(55_000_000);
    expect($claim->txid)->toBe(substr(hash('sha256', "batch{$batch->id}-simulated-quit"), 0, 64));

    $this->get(route('batches.show', $batch))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('members.0.deposit', '0 BCH')
            ->where('members.1.deposit', '0.55 BCH'));
});

it('simulates the members stopping the batch and getting refunds', function () {
    ['batch' => $batch, 'leaver' => $leaver, 'voter' => $voter] = makeLeaveCircle();

    $this->post(route('batches.simulateStop', $batch))
        ->assertRedirect(route('batches.show', $batch))
        ->assertSessionHas('success');

    expect($batch->fresh()->status)->toBe('Stopped');
    expect($leaver->fresh()->status)->toBe('Left');
    expect($voter->fresh()->status)->toBe('Left');

    $refunds = BatchEvent::where('batch_id', $batch->id)->where('type', 'refund')->get();
    expect($refunds)->toHaveCount(2);
    expect($refunds->pluck('amount_sats')->all())->toBe([55_000_000, 55_000_000]);
    expect($refunds->pluck('to_name')->all())->toBe(['Leaver', 'Voter']);
});
