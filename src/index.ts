
/**
 * GPS Daemon Location Proof Plugin
 *
 * Collects GPS fixes from gpsd via `gpspipe -w -n 10`.
 * Requires gpsd running with a GPS device attached.
 *
 * Usage:
 * ```typescript
 * import { GpsdPlugin } from '@location-proofs/plugin-gpsd';
 *
 * const plugin = new GpsdPlugin();
 * const sdk = new AstralSDK({ chainId: 11155111 });
 * sdk.plugins.register(plugin);
 * ```
 */

import { ethers } from 'ethers';
import type {
  LocationProofPlugin,
  Runtime,
  RawSignals,
  UnsignedLocationStamp,
  LocationStamp,
  StampSigner,
  StampVerificationResult,
  CollectOptions,
} from '@decentralized-geo/astral-sdk/plugins';
import type { GpsdPluginOptions } from './types';
import { collectGpsd } from './collect';
import { createStampFromSignals } from './create';
import { signStamp } from './sign';
import { verifyGpsdStamp } from './verify';

export class GpsdPlugin implements LocationProofPlugin {
  readonly name = 'gpsd';
  readonly version = '0.1.0';
  readonly runtimes: Runtime[] = ['node'];
  readonly requiredCapabilities: string[] = [];
  readonly description =
    'GPS daemon plugin — collects GPS fixes from gpsd via gpspipe. ' +
    'Requires gpsd running with a GPS device attached.';

  private readonly timeoutMs: number;
  private readonly durationSeconds: number;
  private readonly wallet: ethers.Wallet | ethers.HDNodeWallet;

  constructor(options: GpsdPluginOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.durationSeconds = options.durationSeconds ?? 60;
    this.wallet = options.privateKey
      ? new ethers.Wallet(options.privateKey)
      : ethers.Wallet.createRandom();
  }

  async collect(_options?: CollectOptions): Promise<RawSignals> {
    return collectGpsd(this.timeoutMs);
  }

  async create(signals: RawSignals): Promise<UnsignedLocationStamp> {
    return createStampFromSignals(signals, this.version, this.durationSeconds);
  }

  async sign(stamp: UnsignedLocationStamp, signer?: StampSigner): Promise<LocationStamp> {
    return signStamp(stamp, this.wallet, signer);
  }

  async verify(stamp: LocationStamp): Promise<StampVerificationResult> {
    return verifyGpsdStamp(stamp);
  }
}

export type { GpsdReading, GpsdPluginOptions } from './types';
export { collectGpsd, readGpsd } from './collect';
export { createStampFromSignals } from './create';
export { signStamp } from './sign';
export { verifyGpsdStamp } from './verify';
export { canonicalize } from './canonicalize';
