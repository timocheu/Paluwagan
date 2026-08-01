<?php

namespace Database\Factories;

use App\Models\Batch;
use App\Models\BatchMember;
use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BatchMember>
 */
class BatchMemberFactory extends Factory
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
            'member_id' => Member::factory(),
            'position' => fake()->numberBetween(1, 12),
            'status' => 'Active',
            'auto_pay' => fake()->boolean(),
        ];
    }
}
