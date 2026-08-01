<?php

use App\Http\Controllers\BatchController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\MemberPortalController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'home/home')->name('home');

Route::get('/member', [MemberPortalController::class, 'index'])->name('member.index');
Route::post('/member/register', [MemberPortalController::class, 'register'])->name('member.register');
Route::get('/member/batches', [MemberPortalController::class, 'batch'])->name('member.batch');
Route::get('/member/batches/created', [MemberPortalController::class, 'created'])->name('member.created');
Route::post('/member/forget', [MemberPortalController::class, 'forget'])->name('member.forget');

Route::post('/batches', [BatchController::class, 'store'])->name('batches.store');
Route::get('/batches', [BatchController::class, 'index'])->name('batches.index');
Route::get('/batches/{batch}', [BatchController::class, 'show'])->name('batches.show');
Route::post('/batches/{batch}/advance', [BatchController::class, 'advance'])->name('batches.advance');
Route::post('/batches/{batch}/expire', [BatchController::class, 'expire'])->name('batches.expire');

Route::post('/members', [MemberController::class, 'store'])->name('members.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
