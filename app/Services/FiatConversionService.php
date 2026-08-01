<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class FiatConversionService
{
    /**
     * The CoinGecko price API returns BCH priced in PHP.
     */
    private const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin-cash&vs_currencies=php';

    /**
     * The current BCH → PHP exchange rate.
     */
    public function rate(): float
    {
        return Cache::remember('bch_php_rate', config('fiat.cache_ttl'), function () {
            try {
                $response = Http::timeout(5)->get(self::COINGECKO_URL);

                $rate = $response->json('bitcoin-cash.php');

                if (is_numeric($rate) && (float) $rate > 0) {
                    return (float) $rate;
                }
            } catch (Throwable) {
                // Fall through to the configured rate below.
            }

            return (float) config('fiat.bch_php_rate');
        });
    }

    /**
     * Convert a sats amount to its PHP value.
     */
    public function convert(int $sats): float
    {
        return ($sats / 100_000_000) * $this->rate();
    }

    /**
     * Format a sats amount as Philippine Pesos.
     */
    public function format(int $sats): string
    {
        return '₱'.number_format($this->convert($sats), 2);
    }
}
