<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemberPortalController extends Controller
{
    /**
     * Show the wallet registration screen.
     */
    public function index(): Response
    {
        return Inertia::render('member/index', [
            'wallet' => session('member_wallet'),
        ]);
    }

    /**
     * Bind a wallet address to the session as the member's identity.
     */
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'wallet' => ['required', 'string', 'max:255'],
        ]);

        session(['member_wallet' => $data['wallet']]);

        return redirect()->route('member.batch');
    }

    /**
     * Show every batch the registered wallet participates in.
     */
    public function batch(): RedirectResponse|Response
    {
        $wallet = session('member_wallet');

        if ($wallet === null) {
            return redirect()->route('member.index');
        }

        $batchMembers = BatchMember::with('batch.batchMembers', 'member', 'contributions')
            ->whereHas('member', fn ($query) => $query->where('wallet', $wallet))
            ->orderByDesc('created_at')
            ->get();

        $batches = $batchMembers
            ->map(fn (BatchMember $bm) => [
                'batch' => $this->batchInfoPayload($bm->batch),
                'member' => $this->memberPayload($bm->batch, $bm),
                'contributions' => $bm->contributions
                    ->sortBy('round')
                    ->map(fn ($contribution) => [
                        'round' => $contribution->round,
                        'amount' => $this->bch($contribution->amount_sats),
                        'txid' => $contribution->tx_id ?? '-',
                    ])
                    ->values(),
                'payoutRounds' => $this->payoutRounds($bm->batch, $bm),
            ])
            ->values();

        return Inertia::render('member/batch', [
            'wallet' => $wallet,
            'batches' => $batches,
        ]);
    }

    /**
     * Show every batch the registered wallet created.
     */
    public function created(): RedirectResponse|Response
    {
        $wallet = session('member_wallet');

        if ($wallet === null) {
            return redirect()->route('member.index');
        }

        $batches = Batch::with('batchMembers')
            ->where('created_by_wallet', $wallet)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Batch $batch) => $this->batchInfoPayload($batch))
            ->values();

        return Inertia::render('member/created', [
            'wallet' => $wallet,
            'batches' => $batches,
        ]);
    }

    /**
     * Drop the session wallet.
     */
    public function forget(): RedirectResponse
    {
        session()->forget('member_wallet');

        return redirect()->route('member.index');
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     status: string,
     *     contributionModel: string,
     *     contributionAmount: string,
     *     targetPayout: string,
     *     schedule: string,
     *     rotation: string,
     *     memberCount: int,
     *     cyclesTotal: int,
     *     cyclesCurrent: int,
     *     nextContributionDate: string|null,
     *     contractStatus: string,
     *     potWallet: string|null,
     * }
     */
    private function batchInfoPayload(Batch $batch): array
    {
        $memberCount = $batch->batchMembers->count();

        return [
            'id' => (string) $batch->id,
            'name' => $batch->name,
            'status' => $batch->status,
            'contributionModel' => 'Fixed Contribution',
            'contributionAmount' => $this->bch($batch->contribution_sats),
            'targetPayout' => $this->bch($batch->contribution_sats * $memberCount),
            'schedule' => ucfirst($batch->schedule),
            'rotation' => $batch->rotation === 'random' ? 'Random Draw' : 'Fixed Order',
            'memberCount' => $memberCount,
            'cyclesTotal' => $batch->rounds_total,
            'cyclesCurrent' => $batch->rounds_current,
            'nextContributionDate' => $batch->status === 'Completed'
                ? null
                : $this->nextContributionDate($batch),
            'contractStatus' => $batch->contract_address !== null ? 'Deployed' : 'Pending',
            'potWallet' => $batch->pot_address,
        ];
    }

    /**
     * @return array{
     *     id: string,
     *     name: string,
     *     address: string,
     *     contribution: string,
     *     saved: string,
     *     progress: int,
     *     due: string,
     *     remaining: string,
     *     autoPay: bool,
     *     status: string,
     * }
     */
    private function memberPayload(Batch $batch, BatchMember $bm): array
    {
        $totalDue = $batch->rounds_current * $batch->contribution_sats;
        $saved = $bm->contributions->sum('amount_sats');

        return [
            'id' => str_pad((string) $bm->id, 2, '0', STR_PAD_LEFT),
            'name' => $bm->member->name ?? 'Member '.$bm->position,
            'address' => $bm->member->wallet,
            'contribution' => $this->bch($batch->contribution_sats),
            'saved' => $this->bch($saved),
            'progress' => $this->progress($batch, $bm),
            'due' => 'Round '.$batch->rounds_current,
            'remaining' => $this->bch(max($totalDue - $saved, 0)),
            'autoPay' => (bool) $bm->auto_pay,
            'status' => $bm->status,
        ];
    }

    /**
     * The rounds this member is designated to receive the pot (payout order
     * for random draws, membership position for fixed rotations).
     *
     * @return array<int, array{round: int, paid: bool}>
     */
    private function payoutRounds(Batch $batch, BatchMember $bm): array
    {
        $payoutRounds = [];

        for ($round = 1; $round <= $batch->rounds_total; $round++) {
            $recipient = $batch->rotation === 'random' ? $bm->payout_order : $bm->position;

            if ($recipient !== $round) {
                continue;
            }

            $payoutRounds[] = [
                'round' => $round,
                'paid' => $round <= $batch->rounds_current && $bm->status === 'Released',
            ];
        }

        return $payoutRounds;
    }

    private function progress(Batch $batch, BatchMember $bm): int
    {
        $totalDue = $batch->rounds_current * $batch->contribution_sats;

        return $totalDue > 0
            ? (int) round(min($bm->contributions->sum('amount_sats') / $totalDue, 1) * 100)
            : 0;
    }

    private function nextContributionDate(Batch $batch): string
    {
        return match ($batch->schedule) {
            'daily' => now()->addDay()->toDateString(),
            'weekly' => now()->addWeek()->toDateString(),
            default => now()->addMonth()->toDateString(),
        };
    }

    private function bch(int $sats): string
    {
        return rtrim(rtrim(number_format($sats / 100_000_000, 8), '0'), '.').' BCH';
    }
}
