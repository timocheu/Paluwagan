<?php

namespace App\Models;

use Database\Factories\BatchFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $status
 * @property int $contribution_sats
 * @property int $rounds_total
 * @property int $rounds_current
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'status', 'contribution_sats', 'rounds_total', 'rounds_current'])]
class Batch extends Model
{
    /** @use HasFactory<BatchFactory> */
    use HasFactory;

    /**
     * The model's default values for attributes.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => 'Forming',
        'rounds_total' => 0,
        'rounds_current' => 0,
    ];

    public function batchMembers(): HasMany
    {
        return $this->hasMany(BatchMember::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'batch_members')
            ->withPivot('position', 'status', 'auto_pay');
    }

    public function contributions(): HasManyThrough
    {
        return $this->hasManyThrough(BatchContribution::class, BatchMember::class);
    }
}
