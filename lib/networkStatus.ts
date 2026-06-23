export function getNetworkStatusLabel(isConnected: boolean): string {
  return isConnected ? 'En línea' : 'Sin conexión';
}
