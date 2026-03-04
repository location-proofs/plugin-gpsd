# @location-proofs/plugin-gpsd

GPS daemon location proof plugin for [Astral Protocol](https://astral.global).

Collects GPS fixes from [gpsd](https://gpsd.gitlab.io/gpsd/) via `gpspipe` and produces signed location stamps with ECDSA signatures.

## Requirements

- Node.js 18+
- `gpsd` running with a GPS device attached
- `gpspipe` available on PATH

## Install

```bash
npm install @location-proofs/plugin-gpsd @decentralized-geo/astral-sdk ethers
```

## Usage

```typescript
import { AstralSDK } from '@decentralized-geo/astral-sdk';
import { GpsdPlugin } from '@location-proofs/plugin-gpsd';

const sdk = new AstralSDK({ chainId: 11155111 });
sdk.plugins.register(new GpsdPlugin({ privateKey: '0x...' }));

const signals = await sdk.stamps.collect({ plugins: ['gpsd'] });
```

### Standalone (without SDK)

```typescript
import { collectGpsd, createStampFromSignals, signStamp, verifyGpsdStamp } from '@location-proofs/plugin-gpsd';
import { ethers } from 'ethers';

const signals = await collectGpsd(5000);
const unsigned = createStampFromSignals(signals, '0.1.0', 60);
const wallet = new ethers.Wallet('0x...');
const stamp = await signStamp(unsigned, wallet);
const result = await verifyGpsdStamp(stamp);
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `privateKey` | random | Hex-encoded ECDSA private key for signing |
| `timeoutMs` | 5000 | gpspipe read timeout in milliseconds |
| `durationSeconds` | 60 | Temporal footprint duration |

## Signals collected

| Field | Description |
|-------|-------------|
| `source` | Always `'gpsd'` |
| `accuracyMeters` | Horizontal accuracy from epx/epy |
| `altitudeMeters` | Altitude if available |
| `speedMs` | Ground speed if available |
| `mode` | GPS fix mode: 2 = 2D, 3 = 3D |

## Verification

The `verify` function checks:

1. **Structure** — lpVersion `0.2`, plugin name, required fields
2. **Signatures** — ECDSA recovery matches declared signer, using canonical (sorted-key) serialization
3. **Signals** — latitude in [-90, 90], longitude in [-180, 180], accuracy > 0, fix mode 2 or 3
