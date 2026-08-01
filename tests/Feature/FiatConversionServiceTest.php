<?php

use App\Services\FiatConversionService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
});

it('returns the live rate from the price feed', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response([
            'bitcoin-cash' => ['php' => 27500.5],
        ]),
    ]);

    expect(app(FiatConversionService::class)->rate())->toBe(27500.5);
});

it('caches the fetched rate', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response([
            'bitcoin-cash' => ['php' => 27500.5],
        ]),
    ]);

    $service = app(FiatConversionService::class);

    $service->rate();
    $service->rate();

    Http::assertSentCount(1);
});

it('falls back to the configured rate when the price feed fails', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response([], 500),
    ]);

    expect(app(FiatConversionService::class)->rate())->toBe(config('fiat.bch_php_rate'));
});

it('falls back to the configured rate when the feed returns no price', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response(['foo' => 'bar']),
    ]);

    expect(app(FiatConversionService::class)->rate())->toBe(config('fiat.bch_php_rate'));
});

it('converts sats to pesos using the rate', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response([
            'bitcoin-cash' => ['php' => 25000],
        ]),
    ]);

    $service = app(FiatConversionService::class);

    expect($service->convert(50_000_000))->toBe(12500.0)
        ->and($service->format(50_000_000))->toBe('₱12,500.00');
});

it('shares the current rate on every Inertia response', function () {
    Http::fake([
        'api.coingecko.com/*' => Http::response([
            'bitcoin-cash' => ['php' => 27500.5],
        ]),
    ]);

    $this->get('/')->assertInertia(fn ($page) => $page
        ->component('home/home')
        ->where('currency.rate', 27500.5)
        ->where('currency.code', 'PHP')
        ->where('currency.symbol', '₱'));
});
