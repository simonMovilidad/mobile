import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useNetwork } from "@/contexts/NetworkContext";
import { getNetworkStatusLabel } from "@/lib/networkStatus";

export function StatusBadge() {
  const colors = useColors();
  const { isConnected } = useNetwork();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isConnected, pulseAnim]);

  return (
    <View style={[styles.badge, { backgroundColor: isConnected ? colors.muted : colors.destructive + "33", borderColor: isConnected ? colors.border : colors.destructive + "66" }]}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: isConnected ? colors.primary : colors.destructive, opacity: pulseAnim },
        ]}
      />
      <Text style={[styles.label, { color: isConnected ? colors.mutedForeground : colors.destructive, fontFamily: "Inter_500Medium" }]}>
        {getNetworkStatusLabel(isConnected)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
  },
});
