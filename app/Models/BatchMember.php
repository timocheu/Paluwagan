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
 * @property string $status
 * @property bool $auto_pay
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['batch_id', 'member_id', 'position', 'status', 'auto_pay'])]
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

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(BatchContribution::class);
    }
}
