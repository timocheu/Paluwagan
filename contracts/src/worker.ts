import {
    Contract,
    MockNetworkProvider,
    SignatureTemplate,
    TransactionBuilder,
    randomUtxo,
} from 'cashscript';
import artifact from './artifacts/round_pot.json' with { type: 'json' };
import { member, organizer } from './keys.ts';

const MINER_FEE = 2000n;

interface RunArgs {
    /** 1-based circle position of the round's recipient. */
    recipientPosition: number;
    contributionSats: bigint;
    memberCount: bigint;
    startBlock: bigint;
    deadline: bigint;
    /** 'claim' evaluates the recipient withdrawal; 'timeout' evaluates the organizer reclaim. */
    phase: 'claim' | 'timeout';
}

function isRunArgs(value: unknown): value is RunArgs {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const args = value as Record<string, unknown>;

    return (
        typeof args.recipientPosition === 'number'
        && typeof args.contributionSats === 'bigint'
        && typeof args.memberCount === 'bigint'
        && typeof args.startBlock === 'bigint'
        && typeof args.deadline === 'bigint'
        && (args.phase === 'claim' || args.phase === 'timeout')
    );
}

function parseArgs(): RunArgs {
    const raw = process.argv[2];

    if (!raw) {
        throw new Error('Usage: node src/worker.ts <json-args>');
    }

    const value = JSON.parse(raw, (_key, item) =>
        typeof item === 'string' && /^\d+n?$/.test(item) ? BigInt(item.replace(/n$/, '')) : item,
    );

    if (!isRunArgs(value)) {
        throw new Error('Invalid arguments: expected recipientPosition, contributionSats, memberCount, startBlock, deadline, phase');
    }

    return value;
}

async function runRound(args: RunArgs): Promise<void> {
    const recipient = member(args.recipientPosition);
    const provider = new MockNetworkProvider();

    const pot = args.contributionSats * args.memberCount;

    const contract = new Contract(
        artifact,
        [recipient.pkh, organizer.pkh, args.contributionSats, args.memberCount, args.startBlock, args.deadline],
        { provider },
    );

    provider.addUtxo(contract.address, randomUtxo({ satoshis: pot }));

    const [utxo] = await contract.getUtxos();

    if (!utxo) {
        throw new Error('No funding UTXO available for the round pot');
    }

    let txid: string;
    let payoutAddress: string;

    if (args.phase === 'claim') {
        const locktime = Number((args.startBlock + args.deadline) / 2n);
        const result = await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.claim(recipient.pub, new SignatureTemplate(recipient.priv)))
            .addOutput({ to: recipient.address, amount: pot - MINER_FEE })
            .setLocktime(locktime)
            .send();

        txid = result.txid;
        payoutAddress = recipient.address;
    } else {
        const result = await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.timeout(organizer.pub, new SignatureTemplate(organizer.priv)))
            .addOutput({ to: organizer.address, amount: pot - MINER_FEE })
            .setLocktime(Number(args.deadline) + 1)
            .send();

        txid = result.txid;
        payoutAddress = organizer.address;
    }

    process.stdout.write(JSON.stringify({
        contractAddress: contract.address,
        txid,
        payoutAddress,
        pot: pot.toString(),
        phase: args.phase,
    }));
}

const args = parseArgs();
await runRound(args);
