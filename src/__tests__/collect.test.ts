
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

// Mock child_process before importing
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: mockSpawn,
}));

import { readGpsd } from '../collect';

function createMockProcess(): ChildProcess {
  const proc = new EventEmitter() as ChildProcess;
  (proc as { stdout: EventEmitter }).stdout = new EventEmitter();
  proc.kill = jest.fn();
  return proc;
}

describe('gpsd collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses a valid TPV message with 3D fix', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);

    // Emit a TPV message
    const tpv = JSON.stringify({
      class: 'TPV',
      mode: 3,
      lat: 40.7484,
      lon: -73.9857,
      alt: 350,
      epx: 5,
      epy: 8,
      speed: 1.2,
    });
    proc.stdout!.emit('data', Buffer.from(tpv + '\n'));

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.source).toBe('gpsd');
    expect(result!.lat).toBe(40.7484);
    expect(result!.lon).toBe(-73.9857);
    expect(result!.accuracyMeters).toBe(8); // max(epx, epy)
    expect(result!.altitudeMeters).toBe(350);
    expect(result!.speedMs).toBe(1.2);
    expect(result!.mode).toBe(3);
    expect(proc.kill).toHaveBeenCalled();
  });

  it('parses a 2D fix (mode 2)', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);

    const tpv = JSON.stringify({
      class: 'TPV',
      mode: 2,
      lat: 51.5074,
      lon: -0.1278,
    });
    proc.stdout!.emit('data', Buffer.from(tpv + '\n'));

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(51.5074);
    expect(result!.accuracyMeters).toBe(10); // default when no epx/epy
    expect(result!.mode).toBe(2);
  });

  it('skips non-TPV messages', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);

    // Emit a SKY message (not TPV) then a valid TPV
    proc.stdout!.emit('data', Buffer.from(JSON.stringify({ class: 'SKY', satellites: [] }) + '\n'));
    proc.stdout!.emit(
      'data',
      Buffer.from(JSON.stringify({ class: 'TPV', mode: 3, lat: 1, lon: 2 }) + '\n')
    );

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(1);
  });

  it('skips TPV with mode 1 (no fix)', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(100);

    proc.stdout!.emit(
      'data',
      Buffer.from(JSON.stringify({ class: 'TPV', mode: 1 }) + '\n')
    );

    // Process closes after timeout
    setTimeout(() => proc.emit('close'), 110);

    const result = await promise;
    expect(result).toBeNull();
  });

  it('returns null on spawn error', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);
    proc.emit('error', new Error('ENOENT'));

    const result = await promise;
    expect(result).toBeNull();
  });

  it('returns null on process close without fix', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);
    proc.emit('close');

    const result = await promise;
    expect(result).toBeNull();
  });

  it('handles chunked data across multiple events', async () => {
    const proc = createMockProcess();
    mockSpawn.mockReturnValue(proc);

    const promise = readGpsd(5000);

    const tpv = JSON.stringify({ class: 'TPV', mode: 3, lat: 10, lon: 20 });
    // Split the message across two chunks
    const mid = Math.floor(tpv.length / 2);
    proc.stdout!.emit('data', Buffer.from(tpv.slice(0, mid)));
    proc.stdout!.emit('data', Buffer.from(tpv.slice(mid) + '\n'));

    const result = await promise;
    expect(result).not.toBeNull();
    expect(result!.lat).toBe(10);
    expect(result!.lon).toBe(20);
  });
});
