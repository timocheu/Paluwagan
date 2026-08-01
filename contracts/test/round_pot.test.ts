import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cashAddressToLockingBytecode } from '@bitauth/libauth';
import {
    Contract,
    MockNetworkProvider,
    SignatureTemplate,
    TransactionBuilder,
    randomUtxo
    
} from 'cashscript';
import type {Utxo} from 'cashscript';
import artifact from '../src/artifacts/round_pot.json' with { type: 'json' };
import { members, organizer } from '../src/keys.ts';

const CONTRIBUTION_SATS = 50_000_000n;
const MEMBER_COUNT = 4n;
const START_BLOCK = 1000n;
const DEADLINE = 2000n;
const MINER_FEE = 2000n;
const POT = CONTRIBUTION_SATS * MEMBER_COUNT;

function lockingBytecodeOf(address: string): Uint8Array {
    const result = cashAddressToLockingBytecode(address);
    assert.ok(typeof result !== 'string', `could not decode ${address}`);

    return result.bytecode;
}

function makeContract(recipientPkh: Uint8Array): { contract: Contract; provider: MockNetworkProvider } {
    const provider = new MockNetworkProvider();
    const contract = new Contract(
        artifact,
        [recipientPkh, organizer.pkh, CONTRIBUTION_SATS, MEMBER_COUNT, START_BLOCK, DEADLINE],
        { provider },
    );
    provider.addUtxo(contract.address, randomUtxo({ satoshis: POT }));

    return { contract, provider };
}

function claimTx(provider: MockNetworkProvider, contract: Contract, utxo: Utxo, payee: typeof members.alice, locktime: number) {
    return new TransactionBuilder({ provider })
        .addInput(utxo, contract.unlock.claim(payee.pub, new SignatureTemplate(payee.priv)))
        .addOutput({ to: payee.address, amount: POT - MINER_FEE })
        .setLocktime(locktime);
}

async function getUtxo(contract: Contract) {
    const utxos = await contract.getUtxos();
    assert.equal(utxos.length, 1);

    return utxos[0];
}

describe('RoundPot', () => {
    it('lets the designated recipient claim the full pot before the deadline', async () => {
        const { contract, provider } = makeContract(members.alice.pkh);
        const utxo = await getUtxo(contract);

        const tx = await claimTx(provider, contract, utxo, members.alice, Number(START_BLOCK) + 500).send();

        assert.equal(typeof tx.txid, 'string');
        assert.deepEqual(tx.outputs[0].lockingBytecode, lockingBytecodeOf(members.alice.address));
        assert.equal(tx.outputs[0].valueSatoshis, POT - MINER_FEE);
    });

    it('rejects a claim from a member who is not the recipient', async () => {
        const { contract, provider } = makeContract(members.alice.pkh);
        const utxo = await getUtxo(contract);

        await assert.rejects(
            claimTx(provider, contract, utxo, members.bob, Number(START_BLOCK) + 500).send(),
        );
    });

    it('rejects a claim signed with the wrong key even for the recipient pkh', async () => {
        const { contract, provider } = makeContract(members.alice.pkh);
        const utxo = await getUtxo(contract);

        const bad = new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.claim(members.alice.pub, new SignatureTemplate(members.carol.priv)))
            .addOutput({ to: members.alice.address, amount: POT - MINER_FEE })
            .setLocktime(Number(START_BLOCK) + 500);

        await assert.rejects(bad.send());
    });

    it('rejects a claim after the deadline has passed', async () => {
        const { contract, provider } = makeContract(members.alice.pkh);
        const utxo = await getUtxo(contract);

        await assert.rejects(
            claimTx(provider, contract, utxo, members.alice, Number(DEADLINE) + 10).send(),
        );
    });

    it('lets the organizer reclaim unclaimed funds after the deadline', async () => {
        const { contract, provider } = makeContract(members.bob.pkh);
        const utxo = await getUtxo(contract);

        const tx = await new TransactionBuilder({ provider })
            .addInput(utxo, contract.unlock.timeout(organizer.pub, new SignatureTemplate(organizer.priv)))
            .addOutput({ to: organizer.address, amount: POT - MINER_FEE })
            .setLocktime(Number(DEADLINE) + 1)
            .send();

        assert.deepEqual(tx.outputs[0].lockingBytecode, lockingBytecodeOf(organizer.address));
        assert.equal(tx.outputs[0].valueSatoshis, POT - MINER_FEE);
    });

    it('rejects the organizer reclaiming before the deadline', async () => {
        const { contract, provider } = makeContract(members.bob.pkh);
        const utxo = await getUtxo(contract);

        await assert.rejects(
            new TransactionBuilder({ provider })
                .addInput(utxo, contract.unlock.timeout(organizer.pub, new SignatureTemplate(organizer.priv)))
                .addOutput({ to: organizer.address, amount: POT - MINER_FEE })
                .setLocktime(Number(DEADLINE) - 1)
                .send(),
        );
    });

    it('does not let a regular member timeout the pot', async () => {
        const { contract, provider } = makeContract(members.carol.pkh);
        const utxo = await getUtxo(contract);

        await assert.rejects(
            new TransactionBuilder({ provider })
                .addInput(utxo, contract.unlock.timeout(members.dave.pub, new SignatureTemplate(members.dave.priv)))
                .addOutput({ to: members.dave.address, amount: POT - MINER_FEE })
                .setLocktime(Number(DEADLINE) + 1)
                .send(),
        );
    });
});
