import {
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
    const seed = deriveSeedFromBip39Mnemonic('Smart Coop ROSCA');
    const rootNode = deriveHdPrivateNodeFromSeed(seed, { throwErrors: true });
    const node = deriveHdPath(rootNode, `m/44'/145'/0'/0/${index}`);

    if (typeof node === 'string') {
        throw new Error(`Failed to derive key at index ${index}: ${node}`);
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

/** Deterministic circle members. */
export const members = {
    alice: derive(0),
    bob: derive(1),
    carol: derive(2),
    dave: derive(3),
} as const;

/** The trusted coordinator who deploys each round and handles timeouts. */
export const organizer = derive(4);
