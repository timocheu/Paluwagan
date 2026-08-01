import {
    decodePrivateKeyWif,
    deriveHdPrivateNodeFromSeed,
    deriveHdPath,
    deriveSeedFromBip39Mnemonic,
    encodeCashAddress,
    secp256k1,
} from '@bitauth/libauth';
import { hash160 } from '@cashscript/utils';

export interface Party {
    /** 32-byte private key. */
    priv: Uint8Array;
    /** 33-byte compressed public key. */
    pub: Uint8Array;
    /** hash160 of the public key (contract identity). */
    pkh: Uint8Array;
    /** bchtest cashaddr for receiving funds. */
    address: string;
}

function derive(index: number): Party {
    return deriveAtPath(`m/44'/145'/0'/0/${index}`);
}

function deriveAtPath(path: string): Party {
    const seed = deriveSeedFromBip39Mnemonic('Smart Coop ROSCA');
    const rootNode = deriveHdPrivateNodeFromSeed(seed, { throwErrors: true });
    const node = deriveHdPath(rootNode, path);

    if (typeof node === 'string') {
        throw new Error(`Failed to derive key at ${path}: ${node}`);
    }

    const priv = node.privateKey as Uint8Array;
    const pub = secp256k1.derivePublicKeyCompressed(priv) as Uint8Array;
    const pkh = hash160(pub);
    const encoded = encodeCashAddress({
        payload: pkh,
        prefix: 'bchtest',
        type: 'p2pkhWithTokens',
    });

    return { priv, pub, pkh, address: encoded.address };
}

/** Deterministic circle members (positions 1-4). */
export const members = {
    alice: derive(0),
    bob: derive(1),
    carol: derive(2),
    dave: derive(3),
} as const;

/** The trusted coordinator who deploys each round and handles timeouts. */
export const organizer = derive(4);

const namedMembers: readonly [Party, Party, Party, Party] = [members.alice, members.bob, members.carol, members.dave];

/**
 * Derive the key for a circle member by 1-based position. Positions 1-4 map
 * to the named demo members (alice, bob, carol, dave); larger circles get
 * their own deterministic keys.
 */
export function member(position: number): Party {
    if (position >= 1 && position <= namedMembers.length) {
        return namedMembers[position - 1];
    }

    return derive(position + 4);
}

/**
 * The per-batch collection wallet where members send their contributions.
 * Derived deterministically from the batch id so the worker can re-derive it.
 */
export function batchWallet(batchId: number): Party {
    return deriveAtPath(`m/44'/145'/0'/1/${batchId}`);
}

/** Build a Party from an imported WIF (e.g. a CashScript playground wallet). */
export function fromWif(wif: string): Party {
    const decoded = decodePrivateKeyWif(wif);

    if (typeof decoded === 'string') {
        throw new Error(`Invalid private key (WIF): ${decoded}`);
    }

    const pub = secp256k1.derivePublicKeyCompressed(decoded.privateKey) as Uint8Array;
    const pkh = hash160(pub);
    const encoded = encodeCashAddress({
        payload: pkh,
        prefix: 'bchtest',
        type: 'p2pkhWithTokens',
    });

    return { priv: decoded.privateKey, pub, pkh, address: encoded.address };
}
