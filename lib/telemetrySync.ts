import type { Coordinate } from '@/contexts/TrackingContext';

export function getTelemetryIngestUrl(): string {
  return `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/telemetry/ingest`;
}

export function buildTelemetryPayload(
  coord: Pick<
    Coordinate,
    | 'latitude'
    | 'longitude'
    | 'speed'
    | 'engineRpm'
    | 'fuelLevel'
    | 'timestamp'
    | 'sessionId'
  >,
  driverName: string,
) {
  return {
    vehicleId: driverName || `mobile-${coord.sessionId}`,
    latitude: coord.latitude,
    longitude: coord.longitude,
    speed: coord.speed || 0,
    engineRpm: coord.engineRpm || 0,
    fuelLevel: coord.fuelLevel || 100,
    timestamp: coord.timestamp,
  };
}

export async function postTelemetry(payload: object): Promise<boolean> {
  const response = await fetch(getTelemetryIngestUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.ok || response.status === 202;
}
