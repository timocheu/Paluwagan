<?php

use App\Http\Controllers\BatchController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'manager/batch')->name('home');

Route::post('/batches', [BatchController::class, 'store'])->name('batches.store');

Route::get('/batches/{batch}', function (string $batch) {
    return inertia('manager/members', [
        'batchId' => $batch,
        'batchName' => ucwords(str_replace('-', ' ', $batch)),
    ]);
})->name('batches.show');

Route::inertia('/batches', 'manager/batch')
    ->name('batches.index');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
