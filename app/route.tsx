// app/route.tsx
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RouteScreen() {
  const router = useRouter();

  const [fromName, setFromName] = useState("Union Station");
  const [toName, setToName] = useState("CF Toronto Eaton Centre");
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  const handleGenerate = () => {
    router.push({
      pathname: "/navigate",
      params: {
        from: fromName,
        to: toName,
        accessible: accessibleOnly ? "1" : "0",
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>◀ Back</Text>
        </TouchableOpacity>

        <View style={styles.container}>
          <Text style={styles.title}>Plan your PATH route</Text>

          <View style={styles.field}>
            <Text style={styles.label}>From</Text>
            <TextInput
              style={styles.input}
              value={fromName}
              onChangeText={setFromName}
              placeholder="Starting location"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>To</Text>
            <TextInput
              style={styles.input}
              value={toName}
              onChangeText={setToName}
              placeholder="Destination"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Accessible only</Text>
            <Switch
              value={accessibleOnly}
              onValueChange={setAccessibleOnly}
              thumbColor={accessibleOnly ? "#fff" : "#f4f4f5"}
              trackColor={{ false: "#4b5563", true: "#2563EB" }}
            />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGenerate}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryLabel}>Generate Route</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "black",
  },
  back: {
    position: "absolute",
    top: 48,
    left: 24,
    zIndex: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  backText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 32,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#111827",
    color: "white",
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 32,
  },
  switchLabel: {
    color: "white",
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryLabel: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
