<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
            ]),
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

        return redirect()->route('batches.show', $batch);
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
        ]);
    }

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
