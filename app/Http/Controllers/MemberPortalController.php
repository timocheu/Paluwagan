<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\BatchContribution;
use App\Models\BatchMember;
use App\Models\Member;
use App\Services\LeaveResolutionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MemberPortalController extends Controller
{
    /**
     * Show the wallet registration screen.
     */
    public function index(): Response
    {
        $wallet = session('member_wallet');

        return Inertia::render('member/index', [
            'wallet' => $wallet,
            'pendingDecisions' => $wallet === null ? [] : $this->pendingDecisions($wallet),
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

        $batchMembers = BatchMember::with('batch.batchMembers.member', 'member', 'contributions')
            ->whereHas('member', fn ($query) => $query->where('wallet', $wallet))
            ->orderByDesc('created_at')
            ->get();

        $batches = $batchMembers
            ->map(fn (BatchMember $bm) => [
                'batch' => $this->batchInfoPayload($bm->batch),
                'member' => $this->memberPayload($bm->batch, $bm),
                'leave' => $this->batchLeavePayload($bm->batch, $bm),
                'contributions' => $bm->contributions
                    ->sortBy('round')
                    ->map(fn (BatchContribution $contribution) => [
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
            'flash' => [
                'success' => session('success'),
                'error' => session('errors') ? session('errors')->first('leave') : null,
            ],
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
     * Ask to leave a circle. The batch pauses until another member decides
     * whether to continue without the departing member.
     */
    public function leave(Batch $batch): RedirectResponse
    {
        $wallet = session('member_wallet');

        if ($wallet === null) {
            return redirect()->route('member.index');
        }

        $batchMember = $this->sessionBatchMember($batch, $wallet);

        if ($batchMember === null) {
            return redirect()->route('member.batch');
        }

        try {
            app(LeaveResolutionService::class)->initiateLeave($batchMember);

            return back()->with('success', 'Leave request sent — other members will decide.');
        } catch (Throwable $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    /**
     * Cast a member's decision on a pending leave. The first member to respond
     * resolves the batch: continue without the leaver or stop and refund.
     */
    public function resolve(Request $request, Batch $batch): RedirectResponse
    {
        $wallet = session('member_wallet');

        if ($wallet === null) {
            return redirect()->route('member.index');
        }

        $data = $request->validate([
            'continue' => ['required', 'boolean'],
        ]);

        $batchMember = $this->sessionBatchMember($batch, $wallet);

        if ($batchMember === null) {
            return redirect()->route('member.batch');
        }

        try {
            app(LeaveResolutionService::class)->vote($batchMember, (bool) $data['continue']);

            return back();
        } catch (Throwable $e) {
            return back()->withErrors(['leave' => $e->getMessage()]);
        }
    }

    /**
     * The batch member record for the session wallet inside a batch, if any.
     */
    private function sessionBatchMember(Batch $batch, string $wallet): ?BatchMember
    {
        return BatchMember::query()
            ->with('batch')
            ->where('batch_id', $batch->id)
            ->whereHas('member', fn ($query) => $query->where('wallet', $wallet))
            ->first();
    }

    /**
     * Batches with a pending leave decision awaiting this wallet's answer.
     *
     * @return array<int, array{batchId: string, batchName: string, leaverName: string}>
     */
    private function pendingDecisions(string $wallet): array
    {
        return BatchMember::query()
            ->with('batch.batchMembers.member')
            ->whereHas('member', fn ($query) => $query->where('wallet', $wallet))
            ->where('status', 'Active')
            ->whereNull('continue_vote')
            ->whereHas('batch', fn ($query) => $query->where('status', 'Resolving'))
            ->get()
            ->map(fn (BatchMember $bm) => [
                'batchId' => (string) $bm->batch->id,
                'batchName' => $bm->batch->name,
                'leaverName' => $bm->batch->batchMembers
                    ->firstWhere('status', 'Leaving')?->member->name ?? 'A member',
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     canLeave: bool,
     *     pendingLeave: array{leaverName: string, voted: bool, isLeaver: bool},
     * }
     */
    private function batchLeavePayload(Batch $batch, BatchMember $bm): array
    {
        $leaver = $batch->batchMembers->firstWhere('status', 'Leaving');

        return [
            'canLeave' => $bm->status === 'Active' && in_array($batch->status, ['Forming', 'Active'], true),
            'pendingLeave' => [
                'leaverName' => $leaver?->member->name ?? 'A member',
                'voted' => $bm->continue_vote !== null,
                'isLeaver' => $bm->status === 'Leaving',
            ],
        ];
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
