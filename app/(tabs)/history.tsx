import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SessionCard } from "@/components/SessionCard";
import { Session, useTracking } from "@/contexts/TrackingContext";
import { useColors } from "@/hooks/useColors";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sessions, clearHistory, pendingSync, stopTracking } = useTracking();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleClear = () => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Borrar todo el historial? Esta acción no se puede deshacer.")) {
        clearHistory();
      }
    } else {
      Alert.alert(
        "Borrar Historial",
        "¿Eliminar todo el historial de sesiones? Esta acción no se puede deshacer.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Borrar todo", style: "destructive", onPress: clearHistory },
        ]
      );
    }
  };

  const handleStop = (sessionId: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("¿Finalizar esta sesión activa?")) {
        stopTracking(sessionId);
        setExpandedId(null);
      }
    } else {
      Alert.alert(
        "Finalizar Sesión",
        "¿Deseas detener el seguimiento y cerrar esta sesión activa?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Finalizar",
            style: "destructive",
            onPress: () => {
              stopTracking(sessionId);
              setExpandedId(null);
            },
          },
        ]
      );
    }
  };

  const totalPoints = sessions.reduce((acc, s) => acc + s.coordinateCount, 0);
  const syncedSessions = sessions.filter((s) => s.synced).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Historial
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {sessions.length} sesión{sessions.length !== 1 ? "es" : ""}
            {totalPoints > 0 ? ` · ${totalPoints} pts` : ""}
          </Text>
        </View>
        {sessions.length > 0 && (
          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [styles.clearBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="trash-2" size={15} color={colors.destructive} />
          </Pressable>
        )}
      </View>

      {/* Stats row */}
      {sessions.length > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
              {sessions.length}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Total
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
              {syncedSessions}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Sincronizados
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: pendingSync > 0 ? colors.warning : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
              {pendingSync}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Pendientes
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {totalPoints}
            </Text>
            <Text style={[styles.statLbl, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Puntos
            </Text>
          </View>
        </View>
      )}

      {/* Sessions list */}
      <FlatList<Session>
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            isExpanded={expandedId === item.id}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onStop={!item.endTime ? () => handleStop(item.id) : undefined}
          />
        )}
        contentContainerStyle={[
          styles.list,
          sessions.length === 0 && styles.emptyList,
          { paddingBottom: insets.bottom + 100 },
        ]}
        scrollEnabled={sessions.length > 0}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="map" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Sin sesiones aún
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Inicia el seguimiento para registrar tu primera sesión
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22 },
  subtitle: { fontSize: 12, marginTop: 2 },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statsBar: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 20 },
  statLbl: { fontSize: 11 },
  statDivider: { width: 1, height: 32, alignSelf: "center", marginHorizontal: 4 },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  emptyList: { flex: 1, justifyContent: "center" },
  emptyContainer: { alignItems: "center", gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center", maxWidth: 220 },
});
