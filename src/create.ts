
import type { RawSignals, UnsignedLocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import type { GpsdReading } from './types';

/**
 * Build an UnsignedLocationStamp from collected gpsd signals.
 */
export function createStampFromSignals(
  signals: RawSignals,
  pluginVersion: string,
  durationSeconds: number
): UnsignedLocationStamp {
  const reading = signals.data as unknown as GpsdReading;
  const now = signals.timestamp;

  return {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: {
      type: 'Point',
      coordinates: [reading.lon, reading.lat], // GeoJSON: [lon, lat]
    },
    srs: 'EPSG:4326',
    temporalFootprint: {
      start: now,
      end: now + durationSeconds,
    },
    plugin: 'gpsd',
    pluginVersion,
    signals: {
      source: reading.source,
      accuracyMeters: reading.accuracyMeters,
      altitudeMeters: reading.altitudeMeters,
      speedMs: reading.speedMs,
      mode: reading.mode,
      lat: reading.lat,
      lon: reading.lon,
    },
  };
}
