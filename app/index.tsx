// app/index.tsx
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MAP = require("../assets/maps/path-map.png");

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ImageBackground source={MAP} style={styles.bg} resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>
            The{" "}
            <Text style={[styles.title, styles.p]}>P</Text>
            <Text style={[styles.title, styles.a]}>A</Text>
            <Text style={[styles.title, styles.t]}>T</Text>
            <Text style={[styles.title, styles.h]}>H</Text>
            <Text style={styles.title}> Pilot</Text>
          </Text>

          <Text style={styles.subtitle}>
            Multi-level indoor navigation for Toronto’s PATH – smooth, simple,
            and fast.
          </Text>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Where to?</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push("/route")}
            >
              <Text style={styles.primaryLabel}>Start Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/lost")}
            >
              <Text style={styles.secondaryLabel}>I’m Lost (AI)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  content: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "white",
  },
  p: { color: "#F44336" },
  a: { color: "#FFC107" },
  t: { color: "#2196F3" },
  h: { color: "#4CAF50" },
  subtitle: {
    marginTop: 16,
    fontSize: 18,
    color: "white",
  },
  panel: {
    marginTop: "auto",
    marginBottom: 32,
    backgroundColor: "white",
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#2563EB",
    marginBottom: 12,
  },
  primaryLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#E5E7EB",
  },
  secondaryLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
});
