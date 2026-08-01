import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const worker = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'worker.ts');

const baseArgs = {
    batchId: 1,
    recipientPosition: 1,
    contributionSats: '50000000',
    memberCount: '4',
    startBlock: '1000',
    deadline: '2000',
};

async function runWorker(args: Record<string, string | number>): Promise<{
    stdout: string;
    code: number | null;
}> {
    const { stdout } = await run('node', [worker, JSON.stringify(args)], { encoding: 'utf8' });

    return { stdout, code: 0 };
}

describe('round worker CLI', () => {
    it('funds the pot wallet, evaluates the claim, and reports the round result', async () => {
        const { stdout } = await runWorker({ ...baseArgs, phase: 'advance' });
        const result = JSON.parse(stdout);

        assert.match(result.potAddress, /^bchtest:/);
        assert.match(result.contractAddress, /^bchtest:/);
        assert.match(result.txid, /^[a-f0-9]{64}$/);
        assert.match(result.fundingTxid, /^[a-f0-9]{64}$/);
        assert.match(result.payoutAddress, /^bchtest:/);
        assert.equal(result.pot, '200000000');
        assert.equal(result.phase, 'advance');
        assert.equal(result.contributions.length, 4);
    });

    it('reports one transaction per member with the marker amounts', async () => {
        const { stdout } = await runWorker({ ...baseArgs, phase: 'advance' });
        const result = JSON.parse(stdout);

        assert.equal(result.contributions[0].position, 1);
        assert.equal(result.contributions[0].amount, '50001000');
        assert.match(result.contributions[0].txid, /^[a-f0-9]{64}$/);

        assert.equal(result.contributions[3].position, 4);
        assert.equal(result.contributions[3].amount, '50004000');
    });

    it('pays the timeout reclaim to the organizer', async () => {
        const { stdout } = await runWorker({ ...baseArgs, recipientPosition: 3, phase: 'timeout' });
        const result = JSON.parse(stdout);

        assert.equal(result.phase, 'timeout');
        assert.match(result.txid, /^[a-f0-9]{64}$/);
        assert.equal(result.pot, '200000000');
    });

    it('supports circles larger than four members', async () => {
        const { stdout } = await runWorker({
            batchId: 3,
            recipientPosition: 7,
            contributionSats: '10000000',
            memberCount: '8',
            startBlock: '1000',
            deadline: '2000',
            phase: 'advance',
        });
        const result = JSON.parse(stdout);

        assert.equal(result.pot, '80000000');
        assert.equal(result.contributions.length, 8);
        assert.match(result.txid, /^[a-f0-9]{64}$/);
    });

    it('derives a deterministic batch pot wallet address', async () => {
        const { stdout } = await run('node', [worker, '--batch-wallet', '1'], { encoding: 'utf8' });
        const { address } = JSON.parse(stdout);

        assert.match(address, /^bchtest:/);

        const { stdout: again } = await run('node', [worker, '--batch-wallet', '1'], { encoding: 'utf8' });

        assert.equal(JSON.parse(again).address, address);
    });

    it('exits non-zero on invalid arguments', async () => {
        await assert.rejects(runWorker({ ...baseArgs, phase: 'sideways' }), /Invalid arguments/);
    });
});
