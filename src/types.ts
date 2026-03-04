
/**
 * GPS daemon reading from gpspipe.
 * Parsed from TPV (Time-Position-Velocity) JSON messages.
 */
export interface GpsdReading {
  source: 'gpsd';
  lat: number;
  lon: number;
  /** Estimated horizontal accuracy in meters (from epx/epy) */
  accuracyMeters: number;
  altitudeMeters?: number;
  speedMs?: number;
  /** GPS fix mode: 2 = 2D fix, 3 = 3D fix */
  mode: number;
  timestamp: number;
}

export interface GpsdPluginOptions {
  /** Per-collector timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
  /** Deterministic private key for signing. If omitted, generates a random wallet. */
  privateKey?: string;
  /** Duration of temporal footprint in seconds (default: 60) */
  durationSeconds?: number;
}
