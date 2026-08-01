<?php

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;
use Illuminate\Database\UniqueConstraintViolationException;

it('creates members, batches, and their pivot rows', function () {
    $batch = Batch::factory()->active()->create([
        'rounds_total' => 4,
        'contribution_sats' => 50_000_000,
    ]);

    $member = Member::factory()->create(['name' => null]);
    $batchMember = BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $member->id,
        'position' => 1,
    ]);

    expect($batchMember->batch->is($batch))->toBeTrue();
    expect($batchMember->member->is($member))->toBeTrue();
    expect($batch->members()->find($member->id)->id)->toBe($member->id);
    expect($batch->batchMembers)->toHaveCount(1);
    expect($member->name)->toBeNull();
});

it('tracks per-round contributions with the batch ledger', function () {
    $batch = Batch::factory()->create();
    $batchMember = BatchMember::factory()->create(['batch_id' => $batch->id]);

    $first = BatchContribution::factory()->create([
        'batch_member_id' => $batchMember->id,
        'round' => 1,
        'amount_sats' => 50_000_000,
    ]);
    BatchContribution::factory()->create([
        'batch_member_id' => $batchMember->id,
        'round' => 2,
        'amount_sats' => 50_000_000,
    ]);

    expect($batch->contributions)->toHaveCount(2);
    expect($batchMember->contributions)->toHaveCount(2);
    expect($batch->contributions->sum('amount_sats'))->toBe(100_000_000);
    expect($first->batchMember->is($batchMember))->toBeTrue();
});

it('prevents duplicate member join per batch and duplicate round per member', function () {
    $batch = Batch::factory()->create();
    $member = Member::factory()->create();

    BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id]);

    expect(fn () => BatchMember::factory()->create([
        'batch_id' => $batch->id,
        'member_id' => $member->id,
    ]))->toThrow(UniqueConstraintViolationException::class);

    $batchMember = BatchMember::factory()->create();
    BatchContribution::factory()->create(['batch_member_id' => $batchMember->id, 'round' => 1]);

    expect(fn () => BatchContribution::factory()->create([
        'batch_member_id' => $batchMember->id,
        'round' => 1,
    ]))->toThrow(UniqueConstraintViolationException::class);
});

it('cascades deletes from batch and member', function () {
    $batch = Batch::factory()->create();
    $member = Member::factory()->create();
    $batchMember = BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id]);
    $contribution = BatchContribution::factory()->create(['batch_member_id' => $batchMember->id]);

    $batch->delete();

    expect(BatchMember::find($batchMember->id))->toBeNull();
    expect(BatchContribution::find($contribution->id))->toBeNull();
    expect(Member::find($member->id))->not->toBeNull();
});
