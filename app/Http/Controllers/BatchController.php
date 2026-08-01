<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BatchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'schedule' => ['required', 'in:monthly,weekly,daily'],
            'contribution' => ['required', 'numeric', 'min:0.00000001'],
            'members' => ['required', 'array', 'min:2'],
            'members.*.name' => ['nullable', 'string', 'max:255'],
            'members.*.wallet' => ['required', 'string', 'max:255'],
        ]);

        $contributionSats = (int) round((float) $data['contribution'] * 100_000_000);

        $batch = Batch::create([
            'name' => $data['name'],
            'schedule' => $data['schedule'],
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

        return redirect()->route('batches.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
