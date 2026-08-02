<?php

namespace App\Models;

use Database\Factories\BatchEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $batch_id
 * @property string $type
 * @property string $from_name
 * @property string $to_name
 * @property int $amount_sats
 * @property string $txid
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['batch_id', 'type', 'from_name', 'to_name', 'amount_sats', 'txid'])]
class BatchEvent extends Model
{
    /** @use HasFactory<BatchEventFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Batch, $this>
     */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
