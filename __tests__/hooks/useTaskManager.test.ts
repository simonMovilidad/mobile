import { Platform } from 'react-native';

describe('TaskManager wrapper', () => {
  it('should delegate to expo-task-manager on native platforms', async () => {
    jest.resetModules();
    const ExpoTaskManager = require('expo-task-manager');
    ExpoTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

    const { TaskManager } = require('@/hooks/useTaskManager') as typeof import('@/hooks/useTaskManager');

    const result = await TaskManager.isTaskRegisteredAsync('background-location-task');

    expect(result).toBe(true);
    expect(ExpoTaskManager.isTaskRegisteredAsync).toHaveBeenCalledWith(
      'background-location-task',
    );
  });

  it('should return false on web without calling native module', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web', select: (o: Record<string, unknown>) => o.web },
    }));

    const ExpoTaskManager = require('expo-task-manager');
    const { TaskManager } = require('@/hooks/useTaskManager') as typeof import('@/hooks/useTaskManager');

    const result = await TaskManager.isTaskRegisteredAsync('background-location-task');

    expect(result).toBe(false);
    expect(ExpoTaskManager.isTaskRegisteredAsync).not.toHaveBeenCalled();
  });
});
