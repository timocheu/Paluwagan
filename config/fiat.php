<?php

return [

    /*
    |--------------------------------------------------------------------------
    | BCH → PHP Exchange Rate
    |--------------------------------------------------------------------------
    |
    | Fallback rate used when the live price feed is unavailable.
    |
    */

    'bch_php_rate' => (float) env('BCH_PHP_RATE', 25000),

    /*
    |--------------------------------------------------------------------------
    | Live Rate Cache
    |--------------------------------------------------------------------------
    |
    | How long (in seconds) a fetched BCH/PHP rate is cached before the
    | price feed is queried again.
    |
    */

    'cache_ttl' => 600,
];
