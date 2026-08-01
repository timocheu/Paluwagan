<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;
use App\Services\RoundService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class BatchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): Response
    {
        $batches = Batch::with('batchMembers.contributions')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('manager/batch', [
            'batches' => $batches->map(fn (Batch $batch) => [
                'id' => (string) $batch->id,
                'name' => $batch->name,
                'memberCount' => $batch->batchMembers->count(),
                'pot' => $this->bch($batch->batchMembers->sum(
                    fn (BatchMember $bm) => $bm->contributions->sum('amount_sats')
                )),
                'round' => [
                    'current' => $batch->rounds_current,
                    'total' => $batch->rounds_total,
                ],
                'contributionProgress' => $batch->rounds_total > 0
                    ? (int) round($batch->rounds_current / $batch->rounds_total * 100)
                    : 0,
                'status' => $batch->status,
                'potContract' => $batch->contract_address,
            ]),
            'totalValueLocked' => $this->bch($batches->sum(
                fn (Batch $batch) => $batch->batchMembers->sum(
                    fn (BatchMember $bm) => $bm->contributions->sum('amount_sats')
                )
            )),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'schedule' => ['required', 'in:monthly,weekly,daily'],
            'rotation' => ['required', 'in:fixed,random'],
            'contribution' => ['required', 'numeric', 'min:0.00000001'],
            'members' => ['required', 'array', 'min:2'],
            'members.*.name' => ['nullable', 'string', 'max:255'],
            'members.*.wallet' => ['required', 'string', 'max:255'],
        ]);

        $contributionSats = (int) round((float) $data['contribution'] * 100_000_000);

        $batch = Batch::create([
            'name' => $data['name'],
            'schedule' => $data['schedule'],
            'rotation' => $data['rotation'],
            'contribution_sats' => $contributionSats,
            'rounds_total' => count($data['members']),
        ]);

        foreach (array_values($data['members']) as $index => $memberData) {
            $member = Member::create([
                'name' => $memberData['name'] ?: null,
                'wallet' => $memberData['wallet'],
            ]);

            $batch->batchMembers()->create([
                'member_id' => $member->id,
                'position' => $index + 1,
            ]);
        }

        $this->assignPayoutOrder($batch);

        try {
            $potAddress = app(RoundService::class)->batchPotAddress($batch);
            $batch->update(['pot_address' => $potAddress]);
        } catch (Throwable $e) {
            Log::warning('Could not derive batch pot wallet.', ['batchId' => $batch->id, 'message' => $e->getMessage()]);
        }

        return redirect()->route('batches.show', $batch);
    }

    /**
     * Assign the payout order. Fixed rotation pays by membership position;
     * random rotation shuffles positions once per cycle so every member gets
     * exactly one pot.
     */
    private function assignPayoutOrder(Batch $batch): void
    {
        $orders = $batch->rotation === 'random'
            ? range(1, $batch->batchMembers->count())
            : null;

        if ($orders !== null) {
            shuffle($orders);
        }

        foreach ($batch->batchMembers()->orderBy('position')->get() as $index => $batchMember) {
            $batchMember->update(['payout_order' => $orders[$index] ?? $batchMember->position]);
        }
    }

    /**
     * Simulate the next round: every member contributes and the recipient
     * claims the pot on-chain.
     */
    public function advance(Batch $batch): RedirectResponse
    {
        try {
            $result = app(RoundService::class)->advance($batch);

            return redirect()
                ->route('batches.show', $batch)
                ->with('success', 'Round '.$batch->rounds_current.' paid out to '.$result['recipientName'].' ('.$result['payoutAddress'].')');
        } catch (Throwable $e) {
            return back()->withErrors(['round' => $e->getMessage()]);
        }
    }

    /**
     * Simulate an expired round: the organizer reclaims the unclaimed pot.
     */
    public function expire(Batch $batch): RedirectResponse
    {
        try {
            $result = app(RoundService::class)->expire($batch);

            return redirect()
                ->route('batches.show', $batch)
                ->with('success', 'Round expired — pot reclaimed by the organizer ('.$result['payoutAddress'].')');
        } catch (Throwable $e) {
            return back()->withErrors(['round' => $e->getMessage()]);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Batch $batch): Response
    {
        $batch->load('batchMembers.member', 'batchMembers.contributions');

        $members = $batch->batchMembers
            ->sortBy('position')
            ->map(fn (BatchMember $bm) => $this->memberPayload($batch, $bm))
            ->values();

        return Inertia::render('manager/members', [
            'batchId' => (string) $batch->id,
            'batchName' => $batch->name,
            'members' => $members,
            'transactions' => $this->transactionsPayload($batch),
            'rotation' => $batch->rotation,
            'rounds' => [
                'current' => $batch->rounds_current,
                'total' => $batch->rounds_total,
            ],
            'batchStatus' => $batch->status,
            'potContract' => $batch->contract_address,
            'potWallet' => $batch->pot_address,
            'flash' => [
                'success' => session('success'),
                'error' => session('errors') ? session('errors')->first('round') : null,
            ],
        ]);
    }

    /**
     * Rebuild the wallet ledger from on-chain data: each member's contribution
     * (member → batch wallet) and the round payouts (batch wallet → recipient).
     *
     * @return array<int, array{txid: string, from: string, to: string, amount: string, round: int, type: string}>
     */
    private function transactionsPayload(Batch $batch): array
    {
        $transactions = [];

        foreach ($batch->batchMembers->sortBy('position') as $bm) {
            foreach ($bm->contributions as $contribution) {
                $transactions[] = [
                    'txid' => $contribution->tx_id ?? '-',
                    'from' => $bm->member->name ?? 'Member '.$bm->position,
                    'to' => 'Batch Wallet',
                    'amount' => $this->bch($contribution->amount_sats),
                    'round' => $contribution->round,
                    'type' => 'contribution',
                ];
            }
        }

        $pot = $this->bch($batch->contribution_sats * $batch->batchMembers->count());

        foreach ($batch->batchMembers as $bm) {
            if ($bm->payout_tx === null) {
                continue;
            }

            $transactions[] = [
                'txid' => $bm->payout_tx,
                'from' => 'Batch Wallet',
                'to' => $bm->member->name ?? 'Member '.$bm->position,
                'amount' => $pot,
                'round' => $bm->payout_order ?? $bm->position,
                'type' => 'payout',
            ];
        }

        return collect($transactions)
            ->sortBy([['round', 'desc'], ['type', 'desc']])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     address: string,
     *     contribution: string,
     *     saved: string,
     *     progress: int,
     *     percent: int,
     *     due: string,
     *     remaining: string,
     *     autoPay: bool,
     *     nextDate: string|null,
     *     status: string,
     * }
     */
    private function memberPayload(Batch $batch, BatchMember $bm): array
    {
        $totalDue = $batch->rounds_current * $batch->contribution_sats;
        $saved = $bm->contributions->sum('amount_sats');
        $percent = $totalDue > 0 ? (int) round(min($saved / $totalDue, 1) * 100) : 0;

        return [
            'id' => str_pad((string) $bm->id, 2, '0', STR_PAD_LEFT),
            'name' => $bm->member->name ?? 'Member '.$bm->position,
            'address' => $bm->member->wallet,
            'contribution' => $this->bch($batch->contribution_sats),
            'saved' => $this->bch($saved),
            'progress' => $percent,
            'percent' => $percent,
            'due' => 'Round '.$batch->rounds_current,
            'remaining' => $this->bch(max($totalDue - $saved, 0)),
            'autoPay' => (bool) $bm->auto_pay,
            'nextDate' => $bm->status === 'Slashed'
                ? null
                : 'Round '.($batch->rounds_current + 1),
            'status' => $bm->status,
        ];
    }

    private function bch(int $sats): string
    {
        return rtrim(rtrim(number_format($sats / 100_000_000, 8), '0'), '.').' BCH';
    }
}
