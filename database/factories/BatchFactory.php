<?php

namespace Database\Factories;

use App\Models\Batch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Batch>
 */
class BatchFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Circle '.ucfirst(fake()->unique()->word()),
            'status' => 'Forming',
            'schedule' => fake()->randomElement(['monthly', 'weekly', 'daily']),
            'rotation' => fake()->randomElement(['fixed', 'random']),
            'contribution_sats' => 50_000_000,
            'rounds_total' => fake()->numberBetween(4, 10),
            'rounds_current' => 0,
        ];
    }

    /**
     * Indicate that the batch is actively collecting contributions.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'Active',
        ]);
    }

    /**
     * Indicate that all rounds have been completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'Completed',
            'rounds_current' => $attributes['rounds_total'],
        ]);
    }
}
