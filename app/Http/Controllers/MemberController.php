<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\Member;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'batch_id' => ['required', 'integer', 'exists:batches,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'wallet' => ['required', 'string', 'max:255'],
            'auto_pay' => ['boolean'],
        ]);

        $batch = Batch::findOrFail((int) $data['batch_id']);

        $member = Member::create([
            'name' => $data['name'] ?: null,
            'wallet' => $data['wallet'],
        ]);

        $nextPosition = (int) $batch->batchMembers()->max('position') + 1;

        $batch->batchMembers()->create([
            'member_id' => $member->id,
            'position' => $nextPosition,
            'auto_pay' => $data['auto_pay'] ?? false,
        ]);

        return redirect()->route('batches.show', $batch);
    }
}
