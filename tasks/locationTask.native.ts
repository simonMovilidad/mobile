import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { LOCATION_TASK_NAME, STORAGE_KEYS } from "@/constants/taskKeys";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

interface BGLocationData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<BGLocationData>) => {
    if (error) return;
    if (!data?.locations?.length) return;

    try {
      const activeSessionJson = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (!activeSessionJson) return;
      const activeSession = JSON.parse(activeSessionJson) as { id: string };

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
      const existing: any[] = raw ? JSON.parse(raw) : [];

      const newCoords: any[] = [];
      for (const loc of data.locations) {
        const coord = {
          id: generateId(),
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp,
          sessionId: activeSession.id,
          synced: false,
        };
        existing.push(coord);
        newCoords.push(coord);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.COORDINATES, JSON.stringify(existing));

      if (newCoords.length > 0) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.LAST_BG_COORD,
          JSON.stringify(newCoords[newCoords.length - 1])
        );
      }

      const sessRaw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
      const sessions: any[] = sessRaw ? JSON.parse(sessRaw) : [];
      const idx = sessions.findIndex((s) => s.id === activeSession.id);
      if (idx >= 0) {
        sessions[idx].coordinateCount = existing.filter(
          (c) => c.sessionId === activeSession.id
        ).length;
        await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      }
    } catch (_) {}
  }
);
