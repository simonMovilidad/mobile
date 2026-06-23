import { getNetworkStatusLabel } from '@/lib/networkStatus';

describe('networkStatus', () => {
  it('should return online label when connected', () => {
    expect(getNetworkStatusLabel(true)).toBe('En línea');
  });

  it('should return offline label when disconnected', () => {
    expect(getNetworkStatusLabel(false)).toBe('Sin conexión');
  });
});
