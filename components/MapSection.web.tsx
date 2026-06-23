import { Feather } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface MapSectionHandle {
  animateTo: (lat: number, lng: number) => void;
}

export interface MapSectionProps {
  isTracking: boolean;
  backgroundTracking: boolean;
  routeCoords: { latitude: number; longitude: number }[];
  currentLocation: { latitude: number; longitude: number; accuracy: number | null } | null;
  glowOpacity: any;
  topPad: number;
  statusBadge: React.ReactNode;
}

const MapSection = forwardRef<MapSectionHandle, MapSectionProps>(
  ({ currentLocation, topPad, statusBadge, routeCoords }, ref) => {
    const colors = useColors();

    useImperativeHandle(ref, () => ({ animateTo: () => {} }));

    return (
      <View style={[styles.wrapper, { backgroundColor: colors.card, paddingTop: topPad + 10 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              TrackOps
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Centro de Control
            </Text>
          </View>
          {statusBadge}
        </View>

        <View style={styles.body}>
          <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
            <Feather name="map" size={28} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Mapa disponible en el dispositivo
          </Text>
          {currentLocation && (
            <View style={[styles.coordChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="crosshair" size={12} color={colors.primary} />
              <Text style={[styles.coordText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}
          {routeCoords.length > 0 && (
            <Text style={[styles.ptCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {routeCoords.length} puntos registrados
            </Text>
          )}
        </View>
      </View>
    );
  }
);

MapSection.displayName = "MapSection";
export default MapSection;

const styles = StyleSheet.create({
  wrapper: { minHeight: 160, paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: { fontSize: 20 },
  subtitle: { fontSize: 11, marginTop: 2 },
  body: { alignItems: "center", gap: 10, paddingVertical: 12 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 13 },
  coordChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  coordText: { fontSize: 12 },
  ptCount: { fontSize: 12 },
});
