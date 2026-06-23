import {
  buildTelemetryPayload,
  getTelemetryIngestUrl,
  postTelemetry,
} from '@/lib/telemetrySync';

const BACKEND_URL = 'http://test-backend:3002';

describe('telemetrySync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_BACKEND_URL = BACKEND_URL;
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
  });

  describe('getTelemetryIngestUrl', () => {
    it('should build ingest URL from EXPO_PUBLIC_BACKEND_URL', () => {
      expect(getTelemetryIngestUrl()).toBe(`${BACKEND_URL}/telemetry/ingest`);
    });

    it('should fallback to localhost when env is not set', () => {
      delete process.env.EXPO_PUBLIC_BACKEND_URL;
      expect(getTelemetryIngestUrl()).toBe('http://localhost:3002/telemetry/ingest');
    });
  });

  describe('buildTelemetryPayload', () => {
    const coord = {
      latitude: 4.6097,
      longitude: -74.0817,
      speed: 45,
      engineRpm: 2200,
      fuelLevel: 80,
      timestamp: 1710000000000,
      sessionId: 'session-1',
    };

    it('should map coordinate fields to backend DTO', () => {
      expect(buildTelemetryPayload(coord, 'VEH-001')).toEqual({
        vehicleId: 'VEH-001',
        latitude: 4.6097,
        longitude: -74.0817,
        speed: 45,
        engineRpm: 2200,
        fuelLevel: 80,
        timestamp: 1710000000000,
      });
    });

    it('should use session fallback when driver name is empty', () => {
      const payload = buildTelemetryPayload(coord, '');
      expect(payload.vehicleId).toBe('mobile-session-1');
    });

    it('should default optional telemetry values', () => {
      const payload = buildTelemetryPayload(
        { ...coord, speed: undefined, engineRpm: undefined, fuelLevel: undefined },
        'VEH-002',
      );
      expect(payload.speed).toBe(0);
      expect(payload.engineRpm).toBe(0);
      expect(payload.fuelLevel).toBe(100);
    });
  });

  describe('postTelemetry', () => {
    it('should return true on HTTP 202', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 202 });

      const ok = await postTelemetry({ vehicleId: 'VEH-1' });

      expect(ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/telemetry/ingest`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should return true on response.ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      expect(await postTelemetry({ vehicleId: 'VEH-1' })).toBe(true);
    });

    it('should return false on non-accepted responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      expect(await postTelemetry({ vehicleId: 'VEH-1' })).toBe(false);
    });
  });
});
