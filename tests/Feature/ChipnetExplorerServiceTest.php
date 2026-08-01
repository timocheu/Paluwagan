<?php

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;
use App\Services\ChipnetExplorerService;
use Illuminate\Support\Facades\Http;

it('resolves member contributions paid into the pot', function () {
    Http::fake([
        'chipnet.bchexplorer.info/*' => Http::response([
            'transactions' => [
                [
                    'tx_hash' => 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
                    'time' => 1700000000,
                    'vin' => [['address' => 'bchtest:member123', 'amount' => 50000000, 'index' => 0]],
                    'vout' => [['address' => 'bchtest:pot456', 'amount' => 50000000, 'index' => 0]],
                ],
                [
                    'tx_hash' => 'f9e8d7c6b5a493827160f1e2d3c4b5a697887766554433221100ffeeddccbbaa',
                    'time' => 1700003600,
                    'vin' => [['address' => 'bchtest:outsider99', 'amount' => 50000000, 'index' => 0]],
                    'vout' => [['address' => 'bchtest:pot456', 'amount' => 50000000, 'index' => 0]],
                ],
            ],
            'nextCursor' => null,
        ]),
    ]);

    $batch = Batch::factory()->create(['contract_address' => 'bchtest:pot456']);
    $member = Member::factory()->create(['name' => 'Alice', 'wallet' => 'bchtest:member123']);
    BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id, 'position' => 1]);

    $logs = app(ChipnetExplorerService::class)->transactionsFor($batch->load('batchMembers.member'));

    expect($logs)->toHaveCount(1)
        ->and($logs[0]['name'])->toBe('Alice')
        ->and($logs[0]['wallet'])->toBe('bchtest:member123')
        ->and($logs[0]['amount'])->toBe('0.5 BCH')
        ->and($logs[0]['date'])->toBe('2023-11-14 22:13');
});

it('falls back to the position-based label for nameless members', function () {
    Http::fake([
        'chipnet.bchexplorer.info/*' => Http::response([
            'transactions' => [
                [
                    'tx_hash' => 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
                    'time' => 1700000000,
                    'vin' => [['address' => 'bchtest:member123', 'amount' => 50000000, 'index' => 0]],
                    'vout' => [['address' => 'bchtest:pot456', 'amount' => 50000000, 'index' => 0]],
                ],
            ],
            'nextCursor' => null,
        ]),
    ]);

    $batch = Batch::factory()->create(['contract_address' => 'bchtest:pot456']);
    $member = Member::factory()->create(['name' => null, 'wallet' => 'bchtest:member123']);
    BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id, 'position' => 3]);

    $logs = app(ChipnetExplorerService::class)->transactionsFor($batch->load('batchMembers.member'));

    expect($logs)->toHaveCount(1)
        ->and($logs[0]['name'])->toBe('Member 3');
});

it('returns an empty log when the explorer is unreachable', function () {
    Http::fake([
        'chipnet.bchexplorer.info/*' => Http::response([], 500),
    ]);

    $batch = Batch::factory()->create(['contract_address' => 'bchtest:pot456']);
    $member = Member::factory()->create(['wallet' => 'bchtest:member123']);
    BatchMember::factory()->create(['batch_id' => $batch->id, 'member_id' => $member->id, 'position' => 1]);

    $logs = app(ChipnetExplorerService::class)->transactionsFor($batch->load('batchMembers.member'));

    expect($logs)->toBe([]);
});

it('returns an empty log when the batch has no pot address', function () {
    $batch = Batch::factory()->create(['contract_address' => null]);

    $logs = app(ChipnetExplorerService::class)->transactionsFor($batch->load('batchMembers.member'));

    expect($logs)->toBe([]);
});
