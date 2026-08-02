<?php

namespace App\Models;

use Database\Factories\BatchMemberFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $batch_id
 * @property int $member_id
 * @property int $position
 * @property int|null $payout_order
 * @property string $status
 * @property bool|null $continue_vote
 * @property string|null $payout_tx
 * @property bool $auto_pay
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['batch_id', 'member_id', 'position', 'payout_order', 'status', 'continue_vote', 'payout_tx', 'auto_pay'])]
class BatchMember extends Model
{
    /** @use HasFactory<BatchMemberFactory> */
    use HasFactory;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'Active',
        'auto_pay' => false,
    ];

    /**
     * @return BelongsTo<Batch, $this>
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /**
     * @return BelongsTo<Member, $this>
     */
    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    /**
     * @return HasMany<BatchContribution, $this>
     */
    public function contributions(): HasMany
    {
        return $this->hasMany(BatchContribution::class);
    }
}
