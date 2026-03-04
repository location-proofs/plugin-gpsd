
import { ethers } from 'ethers';
import type {
  UnsignedLocationStamp,
  LocationStamp,
  StampSigner,
} from '@decentralized-geo/astral-sdk/plugins';

/**
 * Sign an unsigned stamp with ECDSA via ethers.
 * Supports custom StampSigner injection for key management flexibility.
 */
export async function signStamp(
  stamp: UnsignedLocationStamp,
  wallet: ethers.Wallet | ethers.HDNodeWallet,
  signer?: StampSigner
): Promise<LocationStamp> {
  const data = JSON.stringify(stamp);
  const now = Math.floor(Date.now() / 1000);

  let sigValue: string;
  let signerIdentifier = {
    scheme: 'eth-address',
    value: wallet.address,
  };

  if (signer) {
    sigValue = await signer.sign(data);
    signerIdentifier = signer.signer;
  } else {
    sigValue = await wallet.signMessage(data);
  }

  return {
    ...stamp,
    signatures: [
      {
        signer: signerIdentifier,
        algorithm: 'secp256k1',
        value: sigValue,
        timestamp: now,
      },
    ],
  };
}
