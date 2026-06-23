import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/StatusBadge";
import { useNetwork } from "@/contexts/NetworkContext";
import { useTracking } from "@/contexts/TrackingContext";
import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  value,
  color,
  last,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color?: string;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.settingRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <View style={styles.settingLeft}>
        <Feather name={icon} size={15} color={color ?? colors.mutedForeground} />
        <Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
      </View>
      <Text style={[styles.settingValue, { color: color ?? colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isConnected } = useNetwork();
  const {
    driverName,
    setDriverName,
    syncNow,
    pendingSync,
    isSyncing,
    lastSyncTime,
    backgroundTracking,
    hasBackgroundPermission,
    isTracking,
  } = useTracking();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(driverName);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDriverName(trimmed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setNameInput(driverName);
    }
    setEditingName(false);
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return "Sin sincronizar";
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const bgStatus = () => {
    if (Platform.OS === "web") return { label: "No disponible en web", color: colors.mutedForeground };
    if (isTracking && backgroundTracking) return { label: "Activo", color: colors.primary };
    if (hasBackgroundPermission === true) return { label: "Permiso concedido", color: colors.success };
    if (hasBackgroundPermission === false) return { label: "Permiso denegado", color: colors.warning };
    return { label: "Aún no solicitado", color: colors.mutedForeground };
  };

  const bg = bgStatus();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Configuración
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Perfil y preferencias
            </Text>
          </View>
          <StatusBadge />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Driver Profile */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            PERFIL DEL CONDUCTOR
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="user" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                {editingName ? (
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    onBlur={saveName}
                    onSubmitEditing={saveName}
                    autoFocus
                    style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, fontFamily: "Inter_600SemiBold" }]}
                    placeholderTextColor={colors.mutedForeground}
                    returnKeyType="done"
                  />
                ) : (
                  <Pressable onPress={() => { setEditingName(true); setNameInput(driverName); }}>
                    <Text style={[styles.driverName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {driverName}
                    </Text>
                    <Text style={[styles.editHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      Toca para editar
                    </Text>
                  </Pressable>
                )}
              </View>
              {editingName ? (
                <Pressable onPress={saveName} style={[styles.iconBtn, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={15} color={colors.primaryForeground} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => { setEditingName(true); setNameInput(driverName); }}
                  style={[styles.iconBtn, { backgroundColor: colors.muted }]}
                >
                  <Feather name="edit-2" size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Background Location */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            SEGUIMIENTO EN SEGUNDO PLANO
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Status row */}
            <View style={[styles.bgStatusRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.bgIconBox, {
                backgroundColor: isTracking && backgroundTracking ? colors.primary + "20" : colors.muted,
              }]}>
                <Feather
                  name="radio"
                  size={18}
                  color={isTracking && backgroundTracking ? colors.primary : colors.mutedForeground}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bgTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Ubicación en Segundo Plano
                </Text>
                <View style={styles.bgStatusChip}>
                  <View style={[styles.bgDot, { backgroundColor: bg.color }]} />
                  <Text style={[styles.bgStatusLabel, { color: bg.color, fontFamily: "Inter_500Medium" }]}>
                    {bg.label}
                  </Text>
                </View>
              </View>
            </View>

            <SettingRow icon="cpu" label="Modo" value={
              Platform.OS === "web" ? "Geolocalización del navegador" :
              isTracking && backgroundTracking ? "Segundo plano + Primer plano" :
              "Solo primer plano"
            } />
            <SettingRow icon="clock" label="Intervalo de actualización" value="Cada 5 segundos / 10m" />
            <SettingRow icon="zap" label="Precisión" value="Alta (GPS)" last />

            {/* Info box */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Feather name="info" size={13} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                El seguimiento en segundo plano se activa automáticamente al iniciar una sesión si el SO lo permite. En iOS, busca la barra azul de ubicación cuando esté activo.
              </Text>
            </View>

            {Platform.OS !== "web" && (
              <View style={[styles.devBuildBox, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "30" }]}>
                <Feather name="alert-triangle" size={13} color={colors.warning} style={{ marginTop: 1 }} />
                <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  La ubicación en segundo plano requiere una <Text style={{ color: colors.warning, fontFamily: "Inter_600SemiBold" }}>build de desarrollo</Text> — no funciona en Expo Go. El seguimiento en primer plano sí funciona en Expo Go.
                </Text>
              </View>
            )}
          </View>

          {/* Sync */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            SINCRONIZACIÓN
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="wifi" label="Conexión" value={isConnected ? "En línea" : "Sin conexión"} color={isConnected ? colors.primary : colors.destructive} />
            <SettingRow icon="clock" label="Última Sync" value={formatLastSync(lastSyncTime)} />
            <SettingRow icon="upload-cloud" label="Puntos Pendientes" value={pendingSync.toString()} color={pendingSync > 0 ? colors.warning : undefined} last />

            <Pressable
              onPress={syncNow}
              disabled={isSyncing || pendingSync === 0 || !isConnected}
              style={({ pressed }) => [
                styles.syncBtn,
                {
                  backgroundColor: (isSyncing || pendingSync === 0 || !isConnected) ? colors.muted : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather
                name="refresh-cw"
                size={15}
                color={(pendingSync === 0 || !isConnected) ? colors.mutedForeground : colors.primaryForeground}
              />
              <Text style={[styles.syncBtnText, {
                color: (pendingSync === 0 || !isConnected) ? colors.mutedForeground : colors.primaryForeground,
                fontFamily: "Inter_600SemiBold",
              }]}>
                {isSyncing ? "Sincronizando…" : pendingSync === 0 ? "Todo sincronizado" : `Sincronizar ${pendingSync} puntos ahora`}
              </Text>
            </Pressable>
          </View>

          {/* About */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            ACERCA DE
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SettingRow icon="radio" label="Aplicación" value="TrackOps" />
            <SettingRow icon="tag" label="Versión" value="1.0.0" />
            <SettingRow icon="database" label="Almacenamiento" value="Local (AsyncStorage)" last />
          </View>

          {!isConnected && (
            <View style={[styles.offlineBox, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}>
              <Feather name="wifi-off" size={14} color={colors.warning} />
              <Text style={[styles.infoText, { color: colors.warning, fontFamily: "Inter_400Regular" }]}>
                Sin conexión — las coordenadas se guardan localmente y se sincronizarán automáticamente al reconectarse.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: "transparent",
  },
  title: { fontSize: 22 },
  subtitle: { fontSize: 12, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  driverName: { fontSize: 17 },
  editHint: { fontSize: 12, marginTop: 2 },
  nameInput: { fontSize: 17, borderBottomWidth: 1, paddingBottom: 2, paddingHorizontal: 0 },
  iconBtn: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  bgStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bgIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  bgTitle: { fontSize: 15, marginBottom: 4 },
  bgStatusChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  bgDot: { width: 6, height: 6, borderRadius: 3 },
  bgStatusLabel: { fontSize: 12 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingLabel: { fontSize: 14 },
  settingValue: { fontSize: 14 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  devBuildBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  infoText: { fontSize: 12, flex: 1, lineHeight: 18 },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 12,
    padding: 13,
    borderRadius: 10,
  },
  syncBtnText: { fontSize: 14 },
  offlineBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
});
