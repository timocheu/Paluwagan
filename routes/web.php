<?php

use App\Http\Controllers\BatchController;
use App\Http\Controllers\MemberController;
use Illuminate\Support\Facades\Route;

Route::get('/', [BatchController::class, 'index'])->name('home');

Route::post('/batches', [BatchController::class, 'store'])->name('batches.store');
Route::get('/batches', [BatchController::class, 'index'])->name('batches.index');
Route::get('/batches/{batch}', [BatchController::class, 'show'])->name('batches.show');

Route::post('/members', [MemberController::class, 'store'])->name('members.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
