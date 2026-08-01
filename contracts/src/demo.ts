import {
    Contract,
    MockNetworkProvider,
    SignatureTemplate,
    TransactionBuilder,
    randomUtxo,
} from 'cashscript';
import artifact from './artifacts/round_pot.json' with { type: 'json' };
import { members, organizer } from './keys.ts';

const CONTRIBUTION_SATS = 50_000_000n; // 0.5 BCH
const MEMBER_COUNT = 4n;
const START_BLOCK = 1000n;
const DEADLINE = 2000n;
const MINER_FEE = 2000n;
const POT = CONTRIBUTION_SATS * MEMBER_COUNT;

function makeProvider(): MockNetworkProvider {
    return new MockNetworkProvider();
}

function makeContract(provider: MockNetworkProvider, recipientPkh: Uint8Array): Contract {
    const contract = new Contract(
        artifact,
        [recipientPkh, organizer.pkh, CONTRIBUTION_SATS, MEMBER_COUNT, START_BLOCK, DEADLINE],
        { provider },
    );
    provider.addUtxo(contract.address, randomUtxo({ satoshis: POT }));

    return contract;
}

async function runClaimFlow(): Promise<void> {
    const provider = makeProvider();
    const contract = makeContract(provider, members.alice.pkh);

    console.log('contract address:', contract.address);
    console.log('contract balance:', await contract.getBalance());

    const [utxo] = await contract.getUtxos();
    const tx = await new TransactionBuilder({ provider })
        .addInput(utxo, contract.unlock.claim(members.alice.pub, new SignatureTemplate(members.alice.priv)))
        .addOutput({ to: members.alice.address, amount: POT - MINER_FEE })
        .setLocktime(Number(START_BLOCK + 500n))
        .send();

    console.log('recipient claimed pot:', tx.txid);
}

async function runTimeoutFlow(): Promise<void> {
    const provider = makeProvider();
    const contract = makeContract(provider, members.bob.pkh);

    const [utxo] = await contract.getUtxos();
    const tx = await new TransactionBuilder({ provider })
        .addInput(utxo, contract.unlock.timeout(organizer.pub, new SignatureTemplate(organizer.priv)))
        .addOutput({ to: organizer.address, amount: POT - MINER_FEE })
        .setLocktime(Number(DEADLINE + 1n))
        .send();

    console.log('organizer reclaimed unclaimed pot:', tx.txid);
}

async function runWrongRecipientFlow(): Promise<void> {
    const provider = makeProvider();
    const contract = makeContract(provider, members.carol.pkh);

    const [utxo] = await contract.getUtxos();

    try {
        await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.claim(members.dave.pub, new SignatureTemplate(members.dave.priv)))
            .addOutput({ to: members.dave.address, amount: POT - MINER_FEE })
            .setLocktime(Number(START_BLOCK + 500n))
            .send();
        console.error('ERROR: wrong recipient was able to claim the pot!');
        process.exitCode = 1;
    } catch (error) {
        console.log('wrong recipient correctly rejected:', error instanceof Error ? error.constructor.name : error);
    }
}

await runClaimFlow();
await runTimeoutFlow();
await runWrongRecipientFlow();
