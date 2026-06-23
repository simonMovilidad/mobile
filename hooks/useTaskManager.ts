import { Platform } from "react-native";

// Safe wrapper — TaskManager is native-only. All methods no-op on web.
let TaskManagerModule: typeof import("expo-task-manager") | null = null;

if (Platform.OS !== "web") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TaskManagerModule = require("expo-task-manager");
}

export const TaskManager = {
  isTaskRegisteredAsync: async (name: string): Promise<boolean> => {
    if (!TaskManagerModule) return false;
    return TaskManagerModule.isTaskRegisteredAsync(name);
  },
};
