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
 * @property string $schedule
 * @property string $rotation
 * @property int $contribution_sats
 * @property int|null $deposit_sats
 * @property int $rounds_total
 * @property int $rounds_current
 * @property string|null $contract_address
 * @property string|null $pot_address
 * @property string|null $created_by_wallet
 * @property string|null $last_payout_tx
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'status', 'schedule', 'rotation', 'contribution_sats', 'deposit_sats', 'rounds_total', 'rounds_current', 'contract_address', 'pot_address', 'created_by_wallet', 'last_payout_tx'])]
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
        'schedule' => 'monthly',
        'rotation' => 'fixed',
        'rounds_total' => 0,
        'rounds_current' => 0,
    ];

    /**
     * The commitment deposit each member pays at sign-up: the agreed
     * contribution plus 10%.
     */
    public function depositSats(): int
    {
        return $this->deposit_sats ?? (int) round($this->contribution_sats * 1.1);
    }

    /**
     * @return HasMany<BatchMember, $this>
     */
    public function batchMembers(): HasMany
    {
        return $this->hasMany(BatchMember::class);
    }

    /**
     * @return BelongsToMany<Member, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'batch_members')
            ->withPivot('position', 'status', 'auto_pay');
    }

    /**
     * @return HasManyThrough<BatchContribution, BatchMember, $this>
     */
    public function contributions(): HasManyThrough
    {
        return $this->hasManyThrough(BatchContribution::class, BatchMember::class);
    }

    /**
     * @return HasMany<BatchEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(BatchEvent::class);
    }
}
