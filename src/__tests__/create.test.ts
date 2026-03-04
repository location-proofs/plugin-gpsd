
import type { RawSignals } from '@decentralized-geo/astral-sdk/plugins';
import { createStampFromSignals } from '../create';
import type { GpsdReading } from '../types';

function makeSignals(overrides: Partial<GpsdReading> = {}): RawSignals {
  const reading: GpsdReading = {
    source: 'gpsd',
    lat: 40.7484,
    lon: -73.9857,
    accuracyMeters: 5,
    altitudeMeters: 30,
    speedMs: 1.2,
    mode: 3,
    timestamp: 1700000000,
    ...overrides,
  };
  return {
    plugin: 'gpsd',
    timestamp: 1700000000,
    data: reading as unknown as Record<string, unknown>,
  };
}

describe('createStampFromSignals', () => {
  it('produces GeoJSON [lon, lat] coordinate order', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    const coords = (stamp.location as { coordinates: number[] }).coordinates;
    expect(coords[0]).toBe(-73.9857); // longitude first
    expect(coords[1]).toBe(40.7484);  // latitude second
  });

  it('sets correct plugin metadata', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    expect(stamp.plugin).toBe('gpsd');
    expect(stamp.pluginVersion).toBe('0.1.0');
    expect(stamp.lpVersion).toBe('0.2');
    expect(stamp.srs).toBe('EPSG:4326');
    expect(stamp.locationType).toBe('geojson-point');
  });

  it('calculates temporal footprint from duration', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 120);
    expect(stamp.temporalFootprint).toEqual({
      start: 1700000000,
      end: 1700000120,
    });
  });

  it('maps reading fields to signals', () => {
    const stamp = createStampFromSignals(makeSignals(), '0.1.0', 60);
    expect(stamp.signals.source).toBe('gpsd');
    expect(stamp.signals.accuracyMeters).toBe(5);
    expect(stamp.signals.mode).toBe(3);
    expect(stamp.signals.altitudeMeters).toBe(30);
    expect(stamp.signals.speedMs).toBe(1.2);
  });

  it('does not transpose coordinates for southern/eastern hemispheres', () => {
    const signals = makeSignals({ lat: -33.8688, lon: 151.2093 });
    const stamp = createStampFromSignals(signals, '0.1.0', 60);
    const coords = (stamp.location as { coordinates: number[] }).coordinates;
    expect(coords[0]).toBe(151.2093); // Sydney longitude
    expect(coords[1]).toBe(-33.8688); // Sydney latitude
  });
});
