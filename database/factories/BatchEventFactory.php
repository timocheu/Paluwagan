<?php

namespace Database\Factories;

use App\Models\Batch;
use App\Models\BatchEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BatchEvent>
 */
class BatchEventFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'batch_id' => Batch::factory(),
            'type' => fake()->randomElement(['claim', 'refund']),
            'from_name' => 'Batch Wallet',
            'to_name' => fake()->name(),
            'amount_sats' => 50_000_000,
            'txid' => fake()->sha256(),
        ];
    }

    /**
     * Indicate that the event records the organizer claiming a departing
     * member's deposits.
     */
    public function claim(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'claim',
        ]);
    }

    /**
     * Indicate that the event records deposits being returned to a member.
     */
    public function refund(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'refund',
        ]);
    }
}
