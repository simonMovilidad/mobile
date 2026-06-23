import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  NetworkProvider,
  useNetwork,
} from '@/contexts/NetworkContext';

function NetworkProbe() {
  const { isConnected, isInternetReachable } = useNetwork();
  return (
    <Text>
      {isConnected ? 'connected' : 'disconnected'}:{isInternetReachable ? 'online' : 'offline'}
    </Text>
  );
}

describe('NetworkContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  it('should expose connected state after NetInfo fetch', async () => {
    let tree!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <NetworkProvider>
          <NetworkProbe />
        </NetworkProvider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });

    const text = tree.root.findByType(Text);
    expect(text.props.children).toEqual(['connected', ':', 'online']);
  });

  it('should update state when NetInfo listener fires', async () => {
    let listener: ((state: object) => void) | undefined;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return jest.fn();
    });

    let tree!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(
        <NetworkProvider>
          <NetworkProbe />
        </NetworkProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      listener?.({
        isConnected: false,
        isInternetReachable: false,
      });
    });

    const text = tree.root.findByType(Text);
    expect(text.props.children).toEqual(['disconnected', ':', 'offline']);
  });
});
