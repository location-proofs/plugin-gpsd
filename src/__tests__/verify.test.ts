
import { ethers } from 'ethers';
import type { LocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import { verifyGpsdStamp } from '../verify';
import { canonicalize } from '../canonicalize';

const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function makeSignedStamp(
  overrides: Partial<LocationStamp> = {}
): Promise<LocationStamp> {
  const wallet = new ethers.Wallet(TEST_KEY);

  const unsigned = {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: { type: 'Point' as const, coordinates: [-73.9857, 40.7484] },
    srs: 'EPSG:4326',
    temporalFootprint: { start: 1700000000, end: 1700000060 },
    plugin: 'gpsd',
    pluginVersion: '0.1.0',
    signals: {
      source: 'gpsd',
      accuracyMeters: 5,
      mode: 3,
    },
    ...overrides,
  };

  // Remove signatures from overrides to sign the correct unsigned content
  const { signatures: _, ...unsignedClean } = unsigned as LocationStamp;
  void _;

  const message = canonicalize(unsignedClean);
  const sigValue = await wallet.signMessage(message);

  return {
    ...unsignedClean,
    signatures: overrides.signatures ?? [
      {
        signer: { scheme: 'eth-address', value: wallet.address },
        algorithm: 'secp256k1',
        value: sigValue,
        timestamp: 1700000000,
      },
    ],
  };
}

describe('gpsd verification', () => {
  it('validates a well-formed signed stamp', async () => {
    const stamp = await makeSignedStamp();
    const result = await verifyGpsdStamp(stamp);
    expect(result.valid).toBe(true);
    expect(result.structureValid).toBe(true);
    expect(result.signaturesValid).toBe(true);
    expect(result.signalsConsistent).toBe(true);
  });

  it('detects tampering after signing', async () => {
    const stamp = await makeSignedStamp();
    stamp.signals = { ...stamp.signals, accuracyMeters: 999 };
    const result = await verifyGpsdStamp(stamp);
    expect(result.signaturesValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with wrong plugin name', async () => {
    const stamp = await makeSignedStamp({ plugin: 'not-gpsd' });
    const result = await verifyGpsdStamp(stamp);
    expect(result.structureValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with wrong lpVersion', async () => {
    const stamp = await makeSignedStamp({ lpVersion: '0.1' });
    const result = await verifyGpsdStamp(stamp);
    expect(result.structureValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with no signatures', async () => {
    const stamp = await makeSignedStamp({ signatures: [] });
    const result = await verifyGpsdStamp(stamp);
    expect(result.signaturesValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('rejects stamp with invalid signature', async () => {
    const stamp = await makeSignedStamp();
    stamp.signatures[0].value = '0xdeadbeef';
    const result = await verifyGpsdStamp(stamp);
    expect(result.signaturesValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('detects invalid latitude', async () => {
    const stamp = await makeSignedStamp({
      location: { type: 'Point' as const, coordinates: [-73.9857, 999] },
    });
    const result = await verifyGpsdStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.invalidLatitude).toBe(999);
  });

  it('detects invalid longitude', async () => {
    const stamp = await makeSignedStamp({
      location: { type: 'Point' as const, coordinates: [999, 40.7484] },
    });
    const result = await verifyGpsdStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.invalidLongitude).toBe(999);
  });

  it('detects non-positive accuracy', async () => {
    const stamp = await makeSignedStamp({
      signals: { accuracyMeters: 0, mode: 3 },
    });
    const result = await verifyGpsdStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.invalidAccuracy).toBe(0);
  });

  it('detects invalid fix mode', async () => {
    const stamp = await makeSignedStamp({
      signals: { accuracyMeters: 5, mode: 1 },
    });
    const result = await verifyGpsdStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.details.invalidFixMode).toBe(1);
  });

  it('verifies stamps survive JSON round-trip', async () => {
    const stamp = await makeSignedStamp();
    const roundTripped = JSON.parse(JSON.stringify(stamp)) as LocationStamp;
    const result = await verifyGpsdStamp(roundTripped);
    expect(result.signaturesValid).toBe(true);
    expect(result.valid).toBe(true);
  });
});
