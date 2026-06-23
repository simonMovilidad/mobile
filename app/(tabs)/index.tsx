import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapSection, { MapSectionHandle } from "@/components/MapSection";
import { StatusBadge } from "@/components/StatusBadge";
import { useNetwork } from "@/contexts/NetworkContext";
import { Coordinate, useTracking } from "@/contexts/TrackingContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Map takes ~38% of screen height, min 220, max 320
const MAP_HEIGHT = Math.min(320, Math.max(220, Math.round(SCREEN_HEIGHT * 0.38)));

function ElapsedTimer({ startTime }: { startTime: number }) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <Text style={[styles.timerText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
      {h > 0 ? `${h}:` : ""}
      {pad(m)}:{pad(s)}
    </Text>
  );
}

function formatLastSync(ts: number | null): string {
  if (!ts) return "Nunca";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TrackingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetwork();
  const {
    isTracking,
    backgroundTracking,
    activeSession,
    currentLocation,
    pendingSync,
    isSyncing,
    lastSyncTime,
    syncNow,
    startTracking,
    stopTracking,
    getSessionCoordinates,
    fuelLevel,
    engineRpm,
    odometerKm,
  } = useTracking();

  const mapRef = useRef<MapSectionHandle>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  useEffect(() => {
    if (isTracking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
  }, [isTracking, glowAnim]);

  // Auto-sync when internet comes back
  useEffect(() => {
    if (isConnected && pendingSync > 0 && !isSyncing) {
      syncNow();
    }
  }, [isConnected]); // Only trigger on connection change

  useEffect(() => {
    if (!activeSession) {
      setRouteCoords([]);
      return;
    }
    getSessionCoordinates(activeSession.id).then((coords: Coordinate[]) => {
      setRouteCoords(coords.map((c) => ({ latitude: c.latitude, longitude: c.longitude })));
    });
  }, [activeSession]);

  useEffect(() => {
    if (!currentLocation) return;
    const point = { latitude: currentLocation.latitude, longitude: currentLocation.longitude };
    setRouteCoords((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.latitude === point.latitude && last.longitude === point.longitude) return prev;
      return [...prev, point];
    });
    mapRef.current?.animateTo(currentLocation.latitude, currentLocation.longitude);
  }, [currentLocation]);

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isTracking) {
      await stopTracking();
    } else {
      await startTracking();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fixed-height map section — NOT inside ScrollView */}
      <View style={[styles.mapSection, { height: MAP_HEIGHT + topPad }]}>
        <MapSection
          ref={mapRef}
          isTracking={isTracking}
          backgroundTracking={backgroundTracking}
          routeCoords={routeCoords}
          currentLocation={currentLocation}
          glowOpacity={glowOpacity}
          topPad={topPad}
          statusBadge={<StatusBadge />}
        />
      </View>

      {/* Scrollable content below the map */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session / timer card */}
        <View
          style={[
            styles.sessionCard,
            {
              backgroundColor: colors.card,
              borderColor: isTracking ? colors.primary + "50" : colors.border,
            },
          ]}
        >
          {isTracking && (
            <Animated.View
              style={[styles.cardGlow, { borderColor: colors.primary, opacity: glowOpacity }]}
              pointerEvents="none"
            />
          )}

          <View style={styles.sessionTop}>
            <View style={styles.statusChip}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isTracking ? colors.primary : colors.mutedForeground },
                ]}
              />
              <Text
                style={[
                  styles.statusLabel,
                  {
                    color: isTracking ? colors.primary : colors.mutedForeground,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {isTracking ? "EN SEGUIMIENTO" : "EN ESPERA"}
              </Text>
            </View>
            {isTracking && activeSession && (
              <Text
                style={[styles.ptsLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                {activeSession.coordinateCount} pts
              </Text>
            )}
          </View>

          {isTracking && activeSession ? (
            <View style={styles.timerRow}>
              <ElapsedTimer startTime={activeSession.startTime} />
            </View>
          ) : (
            <Text
              style={[styles.idleHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            >
              Inicia una sesión para registrar tu ruta
            </Text>
          )}

          <Pressable
            onPress={handleToggle}
            style={({ pressed }) => [
              styles.actionBtn,
              {
                backgroundColor: isTracking ? colors.destructive : colors.primary,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <Feather
              name={isTracking ? "square" : "navigation"}
              size={20}
              color={isTracking ? colors.destructiveForeground : colors.primaryForeground}
            />
            <Text
              style={[
                styles.actionBtnText,
                {
                  color: isTracking ? colors.destructiveForeground : colors.primaryForeground,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            >
              {isTracking ? "Finalizar Sesión" : "Iniciar Sesión"}
            </Text>
          </Pressable>
        </View>

        {/* Offline Warning Banner */}
        {!isConnected && (
          <View style={[styles.warnBanner, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive, marginBottom: 16 }]}>
            <Feather name="wifi-off" size={14} color={colors.destructive} />
            <Text style={[styles.warnText, { color: colors.destructive, fontFamily: "Inter_500Medium" }]}>
              Sin conexión. Guardando ruta en la memoria local...
            </Text>
          </View>
        )}

        {/* Current coordinates */}
        {currentLocation && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="crosshair" size={13} color={colors.primary} />
              <Text
                style={[styles.cardHeaderLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}
              >
                ÚLTIMA POSICIÓN
              </Text>
            </View>
            <View style={styles.coordRow}>
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  LAT
                </Text>
                <Text style={[styles.coordVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {currentLocation.latitude.toFixed(6)}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.coordItem}>
                <Text style={[styles.coordLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  LNG
                </Text>
                <Text style={[styles.coordVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {currentLocation.longitude.toFixed(6)}
                </Text>
              </View>
              {currentLocation.accuracy != null && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.coordItem}>
                    <Text
                      style={[styles.coordLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                    >
                      ACC
                    </Text>
                    <Text style={[styles.coordVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      ±{currentLocation.accuracy.toFixed(0)}m
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Telemetry card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Fuel row */}
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryHeader}>
              <View style={styles.telemetryLabelRow}>
                <Feather name="droplet" size={14} color="#3DD68C" />
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  COMBUSTIBLE
                </Text>
              </View>
              <Text style={[styles.telemetryVal, { color: "#3DD68C", fontFamily: "Inter_700Bold" }]}>
                {fuelLevel.toFixed(1)}%
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, fuelLevel))}%`, backgroundColor: "#3DD68C" }]} />
            </View>
          </View>

          <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

          {/* RPM row */}
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryHeader}>
              <View style={styles.telemetryLabelRow}>
                <Feather name="activity" size={14} color="#3DD68C" />
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  RPM MOTOR
                </Text>
              </View>
              <Text style={[styles.telemetryVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {engineRpm}
              </Text>
            </View>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${Math.min(100, (engineRpm / 6000) * 100)}%`, backgroundColor: "#3DD68C" }]} />
            </View>
          </View>

          <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

          {/* Odometer row */}
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryHeader}>
              <View style={styles.telemetryLabelRow}>
                <Feather name="map" size={14} color="#3DD68C" />
                <Text style={[styles.telemetryLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
                  KILOMETRAJE
                </Text>
              </View>
              <Text style={[styles.telemetryVal, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {odometerKm.toFixed(2)} km
              </Text>
            </View>
          </View>
        </View>

        {/* Sync row */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.syncRow}>
            <View style={styles.syncLeft}>
              <View
                style={[
                  styles.syncIcon,
                  { backgroundColor: pendingSync > 0 ? colors.warning + "20" : colors.muted },
                ]}
              >
                <Feather
                  name="upload-cloud"
                  size={15}
                  color={pendingSync > 0 ? colors.warning : colors.mutedForeground}
                />
              </View>
              <View>
                <Text style={[styles.syncTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {pendingSync > 0 ? `${pendingSync} pendientes` : "Todo sincronizado"}
                </Text>
                <Text
                  style={[styles.syncSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                >
                  Última sync: {formatLastSync(lastSyncTime)}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={syncNow}
              disabled={isSyncing || pendingSync === 0 || !isConnected}
              style={({ pressed }) => [
                styles.syncBtn,
                {
                  backgroundColor:
                    isSyncing || pendingSync === 0 || !isConnected ? colors.muted : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Feather
                  name="refresh-cw"
                  size={14}
                  color={
                    pendingSync === 0 || !isConnected ? colors.mutedForeground : colors.primaryForeground
                  }
                />
              )}
            </Pressable>
          </View>
        </View>

        {!isConnected && pendingSync > 0 && (
          <View
            style={[
              styles.warnBanner,
              { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" },
            ]}
          >
            <Feather name="wifi-off" size={13} color={colors.warning} />
            <Text style={[styles.warnText, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>
              Sin conexión — {pendingSync} pts guardados localmente
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapSection: { width: "100%", overflow: "hidden" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },

  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    position: "relative",
  },
  cardGlow: {
    position: "absolute",
    inset: -2,
    borderRadius: 16,
    borderWidth: 2,
  },
  sessionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, letterSpacing: 1 },
  ptsLabel: { fontSize: 12 },
  timerRow: { alignItems: "center", paddingVertical: 4 },
  timerText: { fontSize: 44, letterSpacing: -2 },
  idleHint: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 11,
    marginTop: 8,
  },
  actionBtnText: { fontSize: 15 },

  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  cardHeaderLabel: { fontSize: 11, letterSpacing: 0.8 },
  coordRow: { flexDirection: "row", alignItems: "center" },
  coordItem: { flex: 1, alignItems: "center" },
  coordLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 2 },
  coordVal: { fontSize: 12 },
  divider: { width: 1, height: 26, marginHorizontal: 4 },

  syncRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  syncLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  syncIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  syncTitle: { fontSize: 13 },
  syncSub: { fontSize: 11, marginTop: 1 },
  syncBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 10,
    borderRadius: 9,
    borderWidth: 1,
  },
  warnText: { fontSize: 12, flex: 1 },

  telemetryItem: { gap: 8 },
  telemetryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  telemetryLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  telemetryLabel: { fontSize: 12, letterSpacing: 0.8 },
  telemetryVal: { fontSize: 14 },
  progressBarBg: { height: 8, borderRadius: 4, width: "100%", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 4 },
  telemetryDivider: { height: 1, width: "100%", marginVertical: 12 },
});
