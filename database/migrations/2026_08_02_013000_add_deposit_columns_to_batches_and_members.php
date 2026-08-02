<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('batches', function (Blueprint $table) {
            $table->unsignedBigInteger('deposit_sats')->nullable()->after('contribution_sats');
        });

        Schema::table('batch_members', function (Blueprint $table) {
            $table->boolean('deposit_returned')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('batch_members', function (Blueprint $table) {
            $table->dropColumn('deposit_returned');
        });

        Schema::table('batches', function (Blueprint $table) {
            $table->dropColumn('deposit_sats');
        });
    }
};
