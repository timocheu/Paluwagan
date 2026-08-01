import {
    Contract,
    ElectrumNetworkProvider,
    MockNetworkProvider,
    Network,
    SignatureTemplate,
    TransactionBuilder,
    randomUtxo,
} from 'cashscript';
import type { Utxo } from 'cashscript';
import artifact from './artifacts/round_pot.json' with { type: 'json' };
import { batchWallet, fromWif, member, organizer } from './keys.ts';

const MINER_FEE = 2000n;
const CONTRIBUTION_MARKER = 1000n;
const POLL_ATTEMPTS = 6;
const POLL_DELAY_MS = 1000;

type Phase = 'advance' | 'timeout';

interface RunArgs {
    /** Database id of the batch; derives the batch pot wallet. */
    batchId: number;
    /** 1-based circle position of the round's recipient. */
    recipientPosition: number;
    contributionSats: bigint;
    memberCount: bigint;
    startBlock: bigint;
    deadline: bigint;
    /** 'advance' pays the round recipient; 'timeout' lets the organizer reclaim. */
    phase: Phase;
}

interface Contribution {
    position: number;
    amount: string;
    txid: string;
}

interface ProviderSet {
    provider: MockNetworkProvider | ElectrumNetworkProvider;
    live: boolean;
}

function isRunArgs(value: unknown): value is RunArgs {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const args = value as Record<string, unknown>;

    return (
        typeof args.batchId === 'number'
        && typeof args.recipientPosition === 'number'
        && typeof args.contributionSats === 'bigint'
        && typeof args.memberCount === 'bigint'
        && typeof args.startBlock === 'bigint'
        && typeof args.deadline === 'bigint'
        && (args.phase === 'advance' || args.phase === 'timeout')
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
        throw new Error('Invalid arguments: expected batchId, recipientPosition, contributionSats, memberCount, startBlock, deadline, phase');
    }

    return value;
}

function networkFromEnv(): { network: Network | null; hostname?: string } {
    const network = process.env.BCH_NETWORK;
    const hostname = process.env.BCH_ELECTRUM_HOST;

    if (network === 'chipnet') {
        return { network: Network.CHIPNET, hostname };
    }

    if (network === 'testnet4') {
        return { network: Network.TESTNET4, hostname };
    }

    return { network: null };
}

function makeProvider(): ProviderSet {
    const { network, hostname } = networkFromEnv();

    if (network !== null) {
        return { provider: new ElectrumNetworkProvider(network, hostname ? { hostname } : undefined), live: true };
    }

    return { provider: new MockNetworkProvider(), live: false };
}

async function pollUtxos(
    provider: ProviderSet['provider'],
    address: string,
    predicate: (utxos: Utxo[]) => boolean,
    attempts = POLL_ATTEMPTS,
    delayMs = POLL_DELAY_MS,
): Promise<Utxo[]> {
    let utxos: Utxo[] = [];

    for (let attempt = 0; attempt < attempts; attempt++) {
        utxos = await provider.getUtxos(address);

        if (predicate(utxos)) {
            return utxos;
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    return utxos;
}

function expectedContribution(args: RunArgs, position: number): bigint {
    return args.contributionSats + CONTRIBUTION_MARKER * BigInt(position);
}

function positionForAmount(args: RunArgs, amount: bigint): number | null {
    const marker = amount - args.contributionSats;

    if (marker <= 0n || marker % CONTRIBUTION_MARKER !== 0n) {
        return null;
    }

    const position = Number(marker / CONTRIBUTION_MARKER);

    return position >= 1 && position <= Number(args.memberCount) ? position : null;
}

function isMockProvider(provider: ProviderSet['provider']): provider is MockNetworkProvider {
    return 'addUtxo' in provider;
}

/**
 * Make sure every member's contribution sits in the batch pot wallet. On a live
 * network the funder (BCH_FUNDER_WIF) pays any missing contribution; on mocknet
 * the UTXOs are added directly.
 */
async function ensureContributions(
    args: RunArgs,
    provider: ProviderSet['provider'],
    potAddress: string,
): Promise<{ snapshot: Contribution[]; utxos: Utxo[] }> {
    const present = new Set<number>();
    const contributions: Array<{ utxo: Utxo; position: number }> = [];

    const initial = await provider.getUtxos(potAddress);

    for (const utxo of initial) {
        const position = positionForAmount(args, utxo.satoshis);

        if (position !== null && !present.has(position)) {
            present.add(position);
            contributions.push({ utxo, position });
        }
    }

    const missing: number[] = [];

    for (let position = 1; position <= Number(args.memberCount); position++) {
        if (!present.has(position)) {
            missing.push(position);
        }
    }

    if (missing.length > 0) {
        if (!isMockProvider(provider)) {
            await fundFromFunder(args, provider, potAddress, missing);
        } else {
            for (const position of missing) {
                provider.addUtxo(potAddress, randomUtxo({ satoshis: expectedContribution(args, position) }));
            }
        }

        const funded = await pollUtxos(provider, potAddress, (utxos) => {
            const seen = new Set<number>();

            for (const utxo of utxos) {
                const position = positionForAmount(args, utxo.satoshis);

                if (position !== null) {
                    seen.add(position);
                }
            }

            return missing.every((position) => seen.has(position));
        });

        for (const utxo of funded) {
            const position = positionForAmount(args, utxo.satoshis);

            if (position !== null && !present.has(position)) {
                present.add(position);
                contributions.push({ utxo, position });
            }
        }
    }

    if (contributions.length < Number(args.memberCount)) {
        const missingPositions: number[] = [];

        for (let position = 1; position <= Number(args.memberCount); position++) {
            if (!contributions.some((contribution) => contribution.position === position)) {
                missingPositions.push(position);
            }
        }

        throw new Error(`Not all members have contributed to the pot wallet (${potAddress}); missing positions: ${missingPositions.join(', ')}`);
    }

    contributions.sort((a, b) => a.position - b.position);

    return {
        snapshot: contributions.map((contribution) => ({
            position: contribution.position,
            amount: contribution.utxo.satoshis.toString(),
            txid: contribution.utxo.txid,
        })),
        utxos: contributions.map((contribution) => contribution.utxo),
    };
}

async function fundFromFunder(args: RunArgs, provider: ElectrumNetworkProvider, potAddress: string, positions: number[]): Promise<string> {
    const wif = process.env.BCH_FUNDER_WIF;

    if (!wif) {
        throw new Error('BCH_FUNDER_WIF is required when running on a live network');
    }

    const funder = fromWif(wif);
    const total = positions.reduce((sum, position) => sum + expectedContribution(args, position), 0n) + MINER_FEE;
    const utxos = await provider.getUtxos(funder.address);
    const input = utxos.find((utxo) => utxo.satoshis >= total);

    if (!input) {
        throw new Error(`Funder balance insufficient; send chipnet BCH to ${funder.address}`);
    }

    const builder = new TransactionBuilder({ provider }).addInput(input, new SignatureTemplate(wif).unlockP2PKH());

    for (const position of positions) {
        builder.addOutput({ to: potAddress, amount: expectedContribution(args, position) });
    }

    builder.addOutput({ to: funder.address, amount: input.satoshis - total });

    return (await builder.send()).txid;
}

async function fundContract(
    provider: ProviderSet['provider'],
    potWalletAddress: string,
    potWallet: ReturnType<typeof batchWallet>,
    contributionUtxos: Utxo[],
    contract: Contract,
    pot: bigint,
): Promise<string> {
    const builder = new TransactionBuilder({ provider });

    for (const utxo of contributionUtxos) {
        builder.addInput(utxo, new SignatureTemplate(potWallet.priv).unlockP2PKH());
    }

    builder.addOutput({ to: contract.address, amount: pot });

    const markerTotal = contributionUtxos.reduce((sum, utxo) => sum + utxo.satoshis, 0n) - pot;
    const change = markerTotal - MINER_FEE;

    if (change > 0n) {
        builder.addOutput({ to: potWalletAddress, amount: change });
    }

    return (await builder.send()).txid;
}

async function payout(
    args: RunArgs,
    provider: ProviderSet['provider'],
    live: boolean,
    contract: Contract,
    pot: bigint,
    startBlock: bigint,
    deadline: bigint,
): Promise<string> {
    const utxos = await pollUtxos(provider, contract.address, (found) => found.some((utxo) => utxo.satoshis === pot));

    if (!utxos.some((utxo) => utxo.satoshis === pot)) {
        throw new Error('The round pot was not funded on-chain');
    }

    const [utxo] = utxos;
    let txid: string;

    if (args.phase === 'advance') {
        const recipient = member(args.recipientPosition);
        const locktime = live ? Number(await provider.getBlockHeight()) : Number((startBlock + deadline) / 2n);

        const result = await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.claim(recipient.pub, new SignatureTemplate(recipient.priv)))
            .addOutput({ to: recipient.address, amount: pot - MINER_FEE })
            .setLocktime(locktime)
            .send();

        txid = result.txid;
    } else {
        const result = await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.timeout(organizer.pub, new SignatureTemplate(organizer.priv)))
            .addOutput({ to: organizer.address, amount: pot - MINER_FEE })
            .setLocktime(Number(deadline) + 1)
            .send();

        txid = result.txid;
    }

    return txid;
}

async function runRound(args: RunArgs): Promise<void> {
    const { provider, live } = makeProvider();
    const potWallet = batchWallet(args.batchId);
    const potAddress = potWallet.address;
    const pot = args.contributionSats * args.memberCount;
    const recipient = member(args.recipientPosition);

    const { snapshot, utxos } = await ensureContributions(args, provider, potAddress);

    const startBlock = live ? BigInt(await provider.getBlockHeight()) : args.startBlock;
    const deadline = live ? startBlock + (args.deadline - args.startBlock) : args.deadline;

    const contract = new Contract(
        artifact,
        [recipient.pkh, organizer.pkh, args.contributionSats, args.memberCount, startBlock, deadline],
        { provider },
    );

    const fundingTxid = await fundContract(provider, potAddress, potWallet, utxos, contract, pot);
    const txid = await payout(args, provider, live, contract, pot, startBlock, deadline);

    process.stdout.write(JSON.stringify({
        phase: args.phase,
        potAddress,
        contributions: snapshot,
        contractAddress: contract.address,
        fundingTxid,
        txid,
        payoutAddress: args.phase === 'advance' ? recipient.address : organizer.address,
        pot: pot.toString(),
    }));
}

const flag = process.argv[2];

if (flag === '--funder-address') {
    const wif = process.env.BCH_FUNDER_WIF;

    if (!wif) {
        throw new Error('BCH_FUNDER_WIF is not set');
    }

    process.stdout.write(JSON.stringify({ address: fromWif(wif).address }));
    process.exit(0);
}

if (flag === '--batch-wallet') {
    const batchId = Number(process.argv[3]);

    if (!Number.isInteger(batchId) || batchId <= 0) {
        throw new Error('Usage: node src/worker.ts --batch-wallet <id>');
    }

    const wallet = batchWallet(batchId);
    process.stdout.write(JSON.stringify({ address: wallet.address }));
    process.exit(0);
}

const args = parseArgs();
await runRound(args);
