import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { LOCATION_TASK_NAME, STORAGE_KEYS } from "@/constants/taskKeys";
import { TaskManager } from "@/hooks/useTaskManager";

export interface Coordinate {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
  sessionId: string;
  synced: boolean;
  speed?: number;
  fuelLevel?: number;
  engineRpm?: number;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number | null;
  coordinateCount: number;
  synced: boolean;
  driverName: string;
}

interface TrackingContextType {
  isTracking: boolean;
  backgroundTracking: boolean;
  hasBackgroundPermission: boolean | null;
  activeSession: Session | null;
  currentLocation: Coordinate | null;
  sessions: Session[];
  pendingSync: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
  driverName: string;
  setDriverName: (name: string) => void;
  startTracking: () => Promise<void>;
  stopTracking: (forceSessionId?: string) => Promise<void>;
  syncNow: () => Promise<void>;
  clearHistory: () => Promise<void>;
  getSessionCoordinates: (sessionId: string) => Promise<Coordinate[]>;
  fuelLevel: number;
  engineRpm: number;
  odometerKm: number;
}

const TrackingContext = createContext<TrackingContextType | null>(null);

const SERVER_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/telemetry/ingest`;

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const [isTracking, setIsTracking] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [hasBackgroundPermission, setHasBackgroundPermission] = useState<boolean | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [driverName, setDriverNameState] = useState("Driver");
  const [fuelLevel, setFuelLevel] = useState(100);
  const [engineRpm, setEngineRpm] = useState(0);
  const [odometerKm, setOdometerKm] = useState(0);

  const fgSubscription = useRef<Location.LocationSubscription | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSessionRef = useRef<Session | null>(null);
  const fuelRef = useRef<number>(100);
  const rpmRef = useRef<number>(0);
  const odometerRef = useRef<number>(0);
  const lastGpsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastStoreTimeRef = useRef<number>(0);
  const currentLocationRef = useRef<Coordinate | null>(null);
  const syncQueued = useRef(false);

  useEffect(() => {
    currentLocationRef.current = currentLocation;
  }, [currentLocation]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTracking && !backgroundTracking) {
      interval = setInterval(() => {
        // If no coordinate was stored in the last 4.5 seconds (meaning vehicle is perfectly still and OS didn't fire GPS event)
        if (Date.now() - lastStoreTimeRef.current >= 4500) {
          const last = currentLocationRef.current;
          if (last) {
            const beat: Coordinate = {
              ...last,
              id: generateId(),
              timestamp: Date.now(),
              synced: false,
              speed: 0, // Not moving
            };
            storeCoordinate(beat).catch(() => {});
          }
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isTracking, backgroundTracking]);

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  useEffect(() => {
    loadData();
    checkBackgroundPermission();
  }, []);

  async function checkBackgroundPermission() {
    if (Platform.OS === "web") {
      setHasBackgroundPermission(false);
      return;
    }
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      setHasBackgroundPermission(status === "granted");
    } catch (_) {
      setHasBackgroundPermission(false);
    }
  }

  async function loadData() {
    try {
      const [sessionsJson, syncTimeJson, settingsJson, activeSessionJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SESSIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION),
      ]);
      if (sessionsJson) setSessions(JSON.parse(sessionsJson));
      if (syncTimeJson) setLastSyncTime(JSON.parse(syncTimeJson));
      if (settingsJson) {
        const s = JSON.parse(settingsJson);
        if (s.driverName) setDriverNameState(s.driverName);
        if (typeof s.fuelLevel === 'number') {
          fuelRef.current = s.fuelLevel;
          setFuelLevel(s.fuelLevel);
        }
      }
      if (activeSessionJson) {
        const active = JSON.parse(activeSessionJson);
        setActiveSession(active);
        setIsTracking(true);
      }
      await recalcPending();
    } catch (_) {}
  }

  async function recalcPending() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
      const coords: Coordinate[] = raw ? JSON.parse(raw) : [];
      setPendingSync(coords.filter((c) => !c.synced).length);
    } catch (_) {}
  }

  const setDriverName = useCallback(async (name: string) => {
    setDriverNameState(name);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const s = raw ? JSON.parse(raw) : {};
      s.driverName = name;
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
    } catch (_) {}
  }, []);

  // Poll AsyncStorage for background task updates
  function startPolling() {
    if (pollInterval.current) return;
    pollInterval.current = setInterval(async () => {
      try {
        const coordJson = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BG_COORD);
        if (coordJson) {
          const coord: Coordinate = JSON.parse(coordJson);
          setCurrentLocation(coord);
        }
        const sessId = activeSessionRef.current?.id;
        if (sessId) {
          const sessRaw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
          if (sessRaw) {
            const list: Session[] = JSON.parse(sessRaw);
            const updated = list.find((s) => s.id === sessId);
            if (updated) {
              setActiveSession((prev) =>
                prev ? { ...prev, coordinateCount: updated.coordinateCount } : prev
              );
              setSessions(list);
            }
          }
        }
        await recalcPending();
      } catch (_) {}
    }, 3000);
  }

  function stopPolling() {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  }

  const startTracking = useCallback(async () => {
    if (isTracking) return;

    // Foreground permission
    if (Platform.OS !== "web") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
    }

    // Create session
    const session: Session = {
      id: generateId(),
      startTime: Date.now(),
      endTime: null,
      coordinateCount: 0,
      synced: false,
      driverName,
    };

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
    const existing: Session[] = raw ? JSON.parse(raw) : [];
    const updated = [session, ...existing];
    await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    await AsyncStorage.removeItem(STORAGE_KEYS.LAST_BG_COORD);

    setSessions(updated);
    setActiveSession(session);
    setIsTracking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Seed first coordinate immediately so backend activates the vehicle on the portal
    if (Platform.OS !== "web") {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          const coord: Coordinate = {
            id: generateId(),
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
            sessionId: session.id,
            synced: false,
            speed: 0,
          };
          setCurrentLocation(coord);
          storeCoordinate(coord).catch(() => {});
        })
        .catch(() => {});
    }

    if (Platform.OS === "web") {
      // Web: use browser geolocation
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const coord: Coordinate = {
            id: generateId(),
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            sessionId: activeSessionRef.current?.id ?? session.id,
            synced: false,
          };
          setCurrentLocation(coord);
          await storeCoordinate(coord);
        },
        undefined,
        { enableHighAccuracy: true }
      );
      (fgSubscription.current as any) = {
        remove: () => navigator.geolocation.clearWatch(watchId),
      };
      return;
    }

    // Try background location first
    let usedBackground = false;
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      setHasBackgroundPermission(bgStatus === "granted");

      if (bgStatus === "granted") {
        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isTaskRegistered) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "TrackOps",
            notificationBody: "Recording your route in the background",
            notificationColor: "#3DD68C",
          },
        });
        setBackgroundTracking(true);
        usedBackground = true;
        startPolling();
      }
    } catch (_) {}

    // Always also start foreground watcher for live UI updates
    if (!usedBackground || Platform.OS === "ios") {
      // On iOS background tracking handles it; on Android add foreground too for UI
      try {
        fgSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 },
          async (loc) => {
            const coord: Coordinate = {
              id: generateId(),
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              timestamp: loc.timestamp,
              sessionId: activeSessionRef.current?.id ?? session.id,
              synced: false,
            };
            setCurrentLocation(coord);
            if (!backgroundTracking) {
              await storeCoordinate(coord);
            }
          }
        );
      } catch (_) {}
    }
  }, [isTracking, driverName, backgroundTracking]);

  const syncNow = useCallback(async () => {
    if (isSyncing) {
      syncQueued.current = true;
      return;
    }
    setIsSyncing(true);
    syncQueued.current = false;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
      const all: Coordinate[] = raw ? JSON.parse(raw) : [];
      const pending = all.filter((c) => !c.synced);
      if (pending.length === 0) { setIsSyncing(false); return; }

      const syncedIds = new Set<string>();
      
      for (const coord of pending) {
        try {
          // Construct payload matching the backend DTO
          const payload = {
            vehicleId: driverName || `mobile-${coord.sessionId}`,
            latitude: coord.latitude,
            longitude: coord.longitude,
            speed: coord.speed || 0,
            engineRpm: coord.engineRpm || 0,
            fuelLevel: coord.fuelLevel || 100,
            timestamp: coord.timestamp
          };

          const response = await fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          
          if (response.ok || response.status === 202) {
            syncedIds.add(coord.id);
          }
        } catch (err) {
          console.warn('Failed to sync coordinate', err);
        }
      }

      if (syncedIds.size > 0) {
        const updatedCoords = all.map((c) => syncedIds.has(c.id) ? { ...c, synced: true } : c);
        await AsyncStorage.setItem(STORAGE_KEYS.COORDINATES, JSON.stringify(updatedCoords));

        const now = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(now));
        setLastSyncTime(now);
        
        // Recalculate pending
        setPendingSync(all.length - syncedIds.size - all.filter(c => c.synced).length);

        const sessRaw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
        const sessList: Session[] = sessRaw ? JSON.parse(sessRaw) : [];
        
        const updatedSessions = sessList.map((s) => {
          if (s.synced) return s;
          if (s.endTime) {
            const sessionCoords = updatedCoords.filter(c => c.sessionId === s.id);
            const allSynced = sessionCoords.length > 0 && sessionCoords.every(c => c.synced);
            if (allSynced) {
              return { ...s, synced: true };
            }
          }
          return s;
        });

        await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updatedSessions));
        setSessions(updatedSessions);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (_) {
    } finally {
      setIsSyncing(false);
      if (syncQueued.current) {
        setTimeout(() => syncNow(), 100);
      }
    }
  }, [isSyncing, driverName]);

  async function storeCoordinate(coord: Coordinate) {
    try {
      // Simulate Fuel and RPM based on speed
      const speedKmh = coord.speed || 0;
      const drainRate = 0.008 + (speedKmh / 120) * 0.032;
      fuelRef.current = Math.max(0, parseFloat((fuelRef.current - drainRate).toFixed(2)));
      
      const idleRpm = 800;
      const maxRpm = 3800;
      const noise = Math.floor(Math.random() * 200 - 100);
      const simRpm = speedKmh === 0
        ? idleRpm + Math.floor(Math.random() * 100)
        : Math.round(idleRpm + Math.pow(speedKmh / 120, 0.7) * (maxRpm - idleRpm) + noise);
      rpmRef.current = Math.max(700, Math.min(6000, simRpm));

      // Accumulate odometer using Haversine distance
      if (lastGpsRef.current) {
        const R = 6371; // km
        const dLat = ((coord.latitude - lastGpsRef.current.lat) * Math.PI) / 180;
        const dLng = ((coord.longitude - lastGpsRef.current.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lastGpsRef.current.lat * Math.PI) / 180) *
          Math.cos((coord.latitude * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
        const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (distKm < 0.5) { // ignore GPS jumps > 500m
          odometerRef.current = parseFloat((odometerRef.current + distKm).toFixed(3));
          setOdometerKm(odometerRef.current);
        }
      }
      lastGpsRef.current = { lat: coord.latitude, lng: coord.longitude };

      setFuelLevel(fuelRef.current);
      setEngineRpm(rpmRef.current);

      coord.fuelLevel = fuelRef.current;
      coord.engineRpm = rpmRef.current;

      // Persist fuel level to settings
      AsyncStorage.getItem(STORAGE_KEYS.SETTINGS).then((raw) => {
        const s = raw ? JSON.parse(raw) : {};
        s.fuelLevel = fuelRef.current;
        AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
      }).catch(() => {});

      lastStoreTimeRef.current = Date.now();

      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
      const existing: Coordinate[] = raw ? JSON.parse(raw) : [];
      existing.push(coord);
      await AsyncStorage.setItem(STORAGE_KEYS.COORDINATES, JSON.stringify(existing));

      const sessId = coord.sessionId;
      const sessRaw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
      const sessList: Session[] = sessRaw ? JSON.parse(sessRaw) : [];
      const idx = sessList.findIndex((s) => s.id === sessId);
      if (idx >= 0) {
        sessList[idx].coordinateCount = existing.filter((c) => c.sessionId === sessId).length;
        await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessList));
        setSessions([...sessList]);
        setActiveSession((prev) =>
          prev ? { ...prev, coordinateCount: sessList[idx].coordinateCount } : prev
        );
      }
      await recalcPending();
      
      // Attempt automatic sync
      syncNow().catch(() => {});
    } catch (_) {}
  }

  const stopTracking = useCallback(async (forceSessionId?: string) => {
    const targetSessionId = forceSessionId || activeSession?.id;
    if (!targetSessionId) return;

    // If it's the main active session, clean up watchers
    if (targetSessionId === activeSession?.id) {
      fgSubscription.current?.remove();
      fgSubscription.current = null;
    }

    // Stop background task
    if (Platform.OS !== "web") {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      } catch (_) {}
    }

    stopPolling();

    // Finalize session
    const sessRaw = await AsyncStorage.getItem(STORAGE_KEYS.SESSIONS);
    const sessList: Session[] = sessRaw ? JSON.parse(sessRaw) : [];
    const idx = sessList.findIndex((s) => s.id === targetSessionId);
    if (idx >= 0) {
      sessList[idx].endTime = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessList));
      setSessions([...sessList]);
    }
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);

    if (currentLocation) {
      const finalCoord: Coordinate = {
        id: generateId(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        timestamp: Date.now(),
        sessionId: activeSession?.id || "",
        synced: false,
        speed: 0,
      };
      await storeCoordinate(finalCoord);
    }

    if (targetSessionId === activeSession?.id) {
      setIsTracking(false);
      setBackgroundTracking(false);
      setActiveSession(null);
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Ensure all data is sent immediately when stopping
    syncNow().catch(() => {});
  }, [isTracking, activeSession, currentLocation, syncNow]);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.SESSIONS,
      STORAGE_KEYS.COORDINATES,
      STORAGE_KEYS.LAST_SYNC,
    ]);
    setSessions([]);
    setPendingSync(0);
    setLastSyncTime(null);
  }, []);

  const getSessionCoordinates = useCallback(async (sessionId: string): Promise<Coordinate[]> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.COORDINATES);
    const all: Coordinate[] = raw ? JSON.parse(raw) : [];
    return all.filter((c) => c.sessionId === sessionId);
  }, []);

  return (
    <TrackingContext.Provider
      value={{
        isTracking,
        backgroundTracking,
        hasBackgroundPermission,
        activeSession,
        currentLocation,
        sessions,
        pendingSync,
        isSyncing,
        lastSyncTime,
        driverName,
        setDriverName,
        startTracking,
        stopTracking,
        syncNow,
        clearHistory,
        getSessionCoordinates,
        fuelLevel,
        engineRpm,
        odometerKm,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used inside TrackingProvider");
  return ctx;
}
