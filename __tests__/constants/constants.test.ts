import colors from '@/constants/colors';
import { STORAGE_KEYS, LOCATION_TASK_NAME } from '@/constants/taskKeys';

describe('constants', () => {
  it('should define storage keys for offline persistence', () => {
    expect(STORAGE_KEYS.SESSIONS).toBe('driver_sessions');
    expect(STORAGE_KEYS.COORDINATES).toBe('driver_coordinates');
    expect(STORAGE_KEYS.ACTIVE_SESSION).toBe('driver_active_session');
  });

  it('should define background location task name', () => {
    expect(LOCATION_TASK_NAME).toBe('background-location-task');
  });

  it('should expose light and dark palettes with shared radius', () => {
    expect(colors.light.primary).toBe('#3DD68C');
    expect(colors.dark.primary).toBe('#3DD68C');
    expect(colors.radius).toBe(10);
  });
});
