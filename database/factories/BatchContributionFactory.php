<?php

namespace Database\Factories;

use App\Models\BatchContribution;
use App\Models\BatchMember;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BatchContribution>
 */
class BatchContributionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'batch_member_id' => BatchMember::factory(),
            'round' => fake()->numberBetween(1, 12),
            'amount_sats' => 50_000_000,
            'tx_id' => null,
        ];
    }
}
