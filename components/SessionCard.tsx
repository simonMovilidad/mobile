import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Session } from "@/contexts/TrackingContext";

interface SessionCardProps {
  session: Session;
  isExpanded?: boolean;
  onPress?: () => void;
  onStop?: () => void;
}

function formatDuration(startTime: number, endTime: number | null): string {
  const end = endTime ?? Date.now();
  const ms = end - startTime;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function LiveTimer({ startTime }: { startTime: number }) {
  const colors = useColors();
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startTime) / 1000));

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <Text style={[styles.liveTimer, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
      {h > 0 ? `${h}:` : ""}{pad(m)}:{pad(s)}
    </Text>
  );
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={styles.detailLeft}>
        <Feather name={icon} size={13} color={colors.mutedForeground} />
        <Text style={[styles.detailLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.detailValue, { color: valueColor ?? colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
        {value}
      </Text>
    </View>
  );
}

export function SessionCard({ session, isExpanded, onPress, onStop }: SessionCardProps) {
  const colors = useColors();
  const isActive = !session.endTime;

  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const chevronAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: isExpanded ? 1 : 0,
        tension: 80,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(chevronAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded, expandAnim, chevronAnim]);

  const chevronRotate = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const syncColor = isActive
    ? colors.primary
    : session.synced
    ? colors.success
    : colors.warning;

  const syncLabel = isActive ? "En vivo" : session.synced ? "Sincronizado" : "Pendiente";
  const syncIcon = isActive ? "radio" : session.synced ? "check-circle" : "clock";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive
            ? isExpanded
              ? colors.primary + "80"
              : colors.primary + "40"
            : isExpanded
            ? colors.border
            : colors.border,
        },
      ]}
    >
      {/* ── Header row ── */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <View style={[styles.iconBox, { backgroundColor: isActive ? colors.primary + "20" : colors.muted }]}>
            <Feather
              name={isActive ? "navigation" : "map-pin"}
              size={16}
              color={isActive ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View>
            <Text style={[styles.date, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {formatDate(session.startTime)}
            </Text>
            <Text style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {formatTime(session.startTime)}
              {session.endTime ? ` – ${formatTime(session.endTime)}` : "  · Activa"}
            </Text>
          </View>
        </View>

        <View style={styles.rightHeader}>
          <View
            style={[
              styles.syncBadge,
              { backgroundColor: syncColor + "20", borderColor: syncColor + "40" },
            ]}
          >
            <Feather name={syncIcon} size={11} color={syncColor} />
            <Text style={[styles.syncLabel, { color: syncColor, fontFamily: "Inter_500Medium" }]}>
              {syncLabel}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginTop: 6 }}>
            <Feather name="chevron-down" size={15} color={colors.mutedForeground} />
          </Animated.View>
        </View>
      </View>

      {/* ── Quick stats bar ── */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Feather name="crosshair" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {session.coordinateCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            pts
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Feather name="clock" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {formatDuration(session.startTime, session.endTime)}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.stat}>
          <Feather name="user" size={13} color={colors.mutedForeground} />
          <Text
            style={[styles.statValue, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={1}
          >
            {session.driverName}
          </Text>
        </View>
      </View>

      {/* ── Expanded detail panel ── */}
      {isExpanded && (
        <View style={[styles.expandPanel, { borderTopColor: colors.border }]}>
          {/* Live timer for active sessions */}
          {isActive && (
            <View style={[styles.liveBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
              <View style={styles.liveDotRow}>
                <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.liveLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  SESIÓN ACTIVA
                </Text>
              </View>
              <LiveTimer startTime={session.startTime} />
            </View>
          )}

          {/* Detail rows */}
          <View style={[styles.detailBlock, { borderColor: colors.border }]}>
            <DetailRow icon="calendar" label="Inicio" value={formatDateTime(session.startTime)} />
            {session.endTime && (
              <DetailRow icon="flag" label="Fin" value={formatDateTime(session.endTime)} />
            )}
            <DetailRow icon="clock" label="Duración" value={formatDuration(session.startTime, session.endTime)} />
            <DetailRow icon="crosshair" label="Puntos registrados" value={`${session.coordinateCount} pts`} />
            <DetailRow
              icon="upload-cloud"
              label="Sincronización"
              value={isActive ? "En progreso" : session.synced ? "Completada" : "Pendiente"}
              valueColor={isActive ? colors.primary : session.synced ? colors.success : colors.warning}
            />
            <DetailRow icon="user" label="Conductor" value={session.driverName} last />
          </View>

          {/* Stop button — only for active sessions */}
          {isActive && onStop && (
            <Pressable
              onPress={onStop}
              style={({ pressed }) => [
                styles.stopBtn,
                {
                  backgroundColor: colors.destructive,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <Feather name="square" size={16} color={colors.destructiveForeground} />
              <Text style={[styles.stopBtnText, { color: colors.destructiveForeground, fontFamily: "Inter_700Bold" }]}>
                Finalizar Sesión
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  leftHeader: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  date: { fontSize: 14 },
  time: { fontSize: 12, marginTop: 1 },
  rightHeader: { alignItems: "flex-end", gap: 0 },
  syncBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  syncLabel: { fontSize: 11 },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  stat: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center" },
  statValue: { fontSize: 13 },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, height: 18, marginHorizontal: 4 },

  expandPanel: {
    borderTopWidth: 1,
    padding: 14,
    gap: 10,
  },
  liveBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  liveDotRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveLabel: { fontSize: 11, letterSpacing: 1 },
  liveTimer: { fontSize: 38, letterSpacing: -1 },

  detailBlock: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  detailLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13 },

  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 13,
    borderRadius: 11,
  },
  stopBtnText: { fontSize: 15 },
});
