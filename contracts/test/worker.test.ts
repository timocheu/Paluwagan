import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

const run = promisify(execFile);
const worker = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'worker.ts');

const baseArgs = {
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
    it('evaluates a claim and reports the round result', async () => {
        const { stdout } = await runWorker({ ...baseArgs, phase: 'claim' });
        const result = JSON.parse(stdout);

        assert.match(result.contractAddress, /^bchtest:/);
        assert.match(result.txid, /^[a-f0-9]{64}$/);
        assert.match(result.payoutAddress, /^bchtest:/);
        assert.equal(result.pot, '200000000');
        assert.equal(result.phase, 'claim');
    });

    it('evaluates a timeout reclaim for the organizer', async () => {
        const { stdout } = await runWorker({ ...baseArgs, recipientPosition: 3, phase: 'timeout' });
        const result = JSON.parse(stdout);

        assert.equal(result.phase, 'timeout');
        assert.match(result.txid, /^[a-f0-9]{64}$/);
        assert.equal(result.pot, '200000000');
    });

    it('supports circles larger than four members', async () => {
        const { stdout } = await runWorker({
            recipientPosition: 7,
            contributionSats: '10000000',
            memberCount: '8',
            startBlock: '1000',
            deadline: '2000',
            phase: 'claim',
        });
        const result = JSON.parse(stdout);

        assert.equal(result.pot, '80000000');
        assert.match(result.txid, /^[a-f0-9]{64}$/);
    });

    it('exits non-zero on invalid arguments', async () => {
        await assert.rejects(runWorker({ ...baseArgs, phase: 'sideways' }), /Invalid arguments/);
    });
});
