<?php

namespace App\Services;

use App\Models\Batch;
use App\Models\BatchMember;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class ChipnetExplorerService
{
    private const BASE_URL = 'https://chipnet.bchexplorer.info';

    private const CACHE_TTL = 60;

    private const MAX_PAGES = 3;

    private const PAGE_LIMIT = 100;

    /**
     * Resolve the on-chain transactions batch members paid into the pot.
     *
     * @return array<int, array{
     *     id: string,
     *     txid: string,
     *     date: string,
     *     wallet: string,
     *     name: string,
     *     amount: string,
     * }>
     */
    public function transactionsFor(Batch $batch): array
    {
        return Cache::remember("chipnet.pot_transactions.{$batch->id}", self::CACHE_TTL, function () use ($batch): array {
            $pot = $batch->contract_address;

            if ($pot === null || $pot === '') {
                return [];
            }

            $senders = $batch->batchMembers
                ->mapWithKeys(fn (BatchMember $bm) => [$bm->member->wallet => $bm->member->name ?? 'Member '.$bm->position])
                ->all();

            if ($senders === []) {
                return [];
            }

            $logs = [];
            $cursor = null;

            for ($page = 0; $page < self::MAX_PAGES; $page++) {
                try {
                    $response = Http::timeout(5)->acceptJson()->get(self::BASE_URL.'/api/bch/address/'.$pot.'/txs', [
                        'cursor' => $cursor,
                        'limit' => self::PAGE_LIMIT,
                    ]);
                } catch (Throwable $e) {
                    Log::warning('Chipnet explorer unreachable.', ['batch' => $batch->id, 'error' => $e->getMessage()]);

                    break;
                }

                if ($response->failed()) {
                    Log::warning('Chipnet explorer request failed.', ['batch' => $batch->id, 'status' => $response->status()]);

                    break;
                }

                $payload = $response->json();

                foreach ($payload['transactions'] ?? [] as $transaction) {
                    $sender = $this->senderFor($transaction, $senders);

                    if ($sender === null) {
                        continue;
                    }

                    $logs[] = [
                        'id' => (string) $transaction['tx_hash'],
                        'txid' => (string) $transaction['tx_hash'],
                        'date' => $this->formatDate((int) ($transaction['time'] ?? 0)),
                        'wallet' => $sender,
                        'name' => $senders[$sender],
                        'amount' => $this->bch($this->incomingSats($transaction, $pot)),
                    ];
                }

                $cursor = $payload['nextCursor'] ?? null;

                if ($cursor === null || $cursor === '') {
                    break;
                }
            }

            return $logs;
        });
    }

    /**
     * Find the member wallet that paid into this transaction, if any.
     *
     * @param  array<string, mixed>  $transaction
     * @param  array<string, string>  $senders
     */
    private function senderFor(array $transaction, array $senders): ?string
    {
        foreach ($transaction['vin'] ?? [] as $input) {
            $address = $input['address'] ?? null;

            if ($address !== null && array_key_exists($address, $senders)) {
                return $address;
            }
        }

        return null;
    }

    /**
     * Sum the satoshis a transaction pays into the pot.
     *
     * @param  array<string, mixed>  $transaction
     */
    private function incomingSats(array $transaction, string $pot): int
    {
        $sats = 0;

        foreach ($transaction['vout'] ?? [] as $output) {
            if (($output['address'] ?? null) === $pot) {
                $sats += (int) ($output['amount'] ?? 0);
            }
        }

        return $sats;
    }

    private function formatDate(int $timestamp): string
    {
        if ($timestamp > 10_000_000_000) {
            $timestamp = (int) floor($timestamp / 1000);
        }

        return Carbon::createFromTimestamp($timestamp)->format('Y-m-d H:i');
    }

    private function bch(int $sats): string
    {
        return rtrim(rtrim(number_format($sats / 100_000_000, 8), '0'), '.').' BCH';
    }
}
