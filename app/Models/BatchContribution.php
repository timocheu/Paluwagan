<?php

namespace App\Models;

use Database\Factories\BatchContributionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $batch_member_id
 * @property int $round
 * @property int $amount_sats
 * @property string|null $tx_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['batch_member_id', 'round', 'amount_sats', 'tx_id'])]
class BatchContribution extends Model
{
    /** @use HasFactory<BatchContributionFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<BatchMember, $this>
     */
    public function batchMember(): BelongsTo
    {
        return $this->belongsTo(BatchMember::class);
    }
}
