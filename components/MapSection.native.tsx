import { Feather } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { useColors } from "@/hooks/useColors";

export interface MapSectionHandle {
  animateTo: (lat: number, lng: number) => void;
}

export interface MapSectionProps {
  isTracking: boolean;
  backgroundTracking: boolean;
  routeCoords: { latitude: number; longitude: number }[];
  currentLocation: { latitude: number; longitude: number; accuracy: number | null } | null;
  glowOpacity: Animated.AnimatedInterpolation<string | number>;
  topPad: number;
  statusBadge: React.ReactNode;
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a88a8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#16192a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#252840" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e2138" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2d3154" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#131628" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1d2035" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#363b5c" }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a2232" }] },
];

const MapSection = forwardRef<MapSectionHandle, MapSectionProps>(
  ({ isTracking, backgroundTracking, routeCoords, currentLocation, glowOpacity, topPad, statusBadge }, ref) => {
    const colors = useColors();
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateTo: (lat: number, lng: number) => {
        mapRef.current?.animateToRegion(
          { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
          500
        );
      },
    }));

    const initialRegion = currentLocation
      ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
      : { latitude: 19.432608, longitude: -99.133209, latitudeDelta: 0.05, longitudeDelta: 0.05 };

    return (
      <View style={styles.wrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation={isTracking}
          followsUserLocation={false}
          mapType="standard"
          customMapStyle={darkMapStyle}
          showsCompass={false}
          showsMyLocationButton={false}
        >
          {routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={4}
            />
          )}
          {currentLocation && (
            <Marker
              coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={[styles.markerOuter, { borderColor: colors.primary + "60" }]}>
                <View style={[styles.markerInner, { backgroundColor: colors.primary }]} />
              </View>
            </Marker>
          )}
        </MapView>

        {/* Header overlay */}
        <View style={[styles.headerOverlay, { paddingTop: topPad + 10 }]}>
          <View>
            <Text style={[styles.mapTitle, { fontFamily: "Inter_700Bold" }]}>TrackOps</Text>
            <Text style={[styles.mapSubtitle, { fontFamily: "Inter_400Regular" }]}>Driver Command Center</Text>
          </View>
          {statusBadge}
        </View>

        {/* LIVE / Background badge */}
        {isTracking && (
          <Animated.View style={[
            styles.liveBadge,
            {
              backgroundColor: backgroundTracking ? colors.primary + "E6" : "#2D3154E6",
              borderColor: backgroundTracking ? "transparent" : colors.border,
              opacity: glowOpacity,
            },
          ]}>
            <Feather
              name={backgroundTracking ? "radio" : "navigation"}
              size={11}
              color={backgroundTracking ? colors.primaryForeground : colors.primary}
            />
            <Text style={[styles.liveText, {
              color: backgroundTracking ? colors.primaryForeground : colors.primary,
              fontFamily: "Inter_700Bold",
            }]}>
              {backgroundTracking ? "BACKGROUND" : "LIVE"}
            </Text>
          </Animated.View>
        )}

        {/* Point count */}
        {routeCoords.length > 0 && (
          <View style={[styles.statsChip, { backgroundColor: "rgba(22,25,42,0.85)", borderColor: colors.border }]}>
            <Feather name="crosshair" size={11} color={colors.primary} />
            <Text style={[styles.statsText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {routeCoords.length} pts
            </Text>
          </View>
        )}
      </View>
    );
  }
);

MapSection.displayName = "MapSection";
export default MapSection;

const styles = StyleSheet.create({
  wrapper: { flex: 1, minHeight: 260 },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mapTitle: { fontSize: 20, color: "#FFFFFF" },
  mapSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  markerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(22,25,42,0.6)",
  },
  markerInner: { width: 9, height: 9, borderRadius: 5 },
  liveBadge: {
    position: "absolute",
    bottom: 14,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  liveText: { fontSize: 11, letterSpacing: 1 },
  statsChip: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statsText: { fontSize: 12 },
});
