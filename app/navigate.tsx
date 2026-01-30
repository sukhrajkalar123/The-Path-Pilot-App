// app/navigate.tsx
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapRoutePreview from "../src/components/MapRoutePreview";
import { findPOIByName, loadGraph } from "../src/data/path/loadGraph";
import { computeShortestPath, smoothRoute } from "../src/routing/computeRoute";

const MAP = require("../assets/maps/path-map.png");

export default function NavigateScreen() {
  const params = useLocalSearchParams();

  const fromName =
    (typeof params.from === "string" && params.from) || "Union Station";
  const toName =
    (typeof params.to === "string" && params.to) ||
    "CF Toronto Eaton Centre";
  const accessibleOnly = params.accessible === "1";

  const graph = useMemo(() => loadGraph(), []);

  const fromPOI = findPOIByName(graph, fromName);
  const toPOI = findPOIByName(graph, toName);

  if (!fromPOI || !toPOI || !fromPOI.nodeId || !toPOI.nodeId) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>POI not found</Text>
          <Text style={styles.errorBody}>
            Make sure the From / To names match a location in the PATH
            directory JSON.
          </Text>
        </View>
      </>
    );
  }

  const result = computeShortestPath(graph, fromPOI.nodeId, toPOI.nodeId, {
    accessibleOnly,
  });

  if (!result || result.points.length < 2) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>No route found</Text>
          <Text style={styles.errorBody}>
            The path graph may be missing connections. Try regenerating it or
            pick nearby locations.
          </Text>
        </View>
      </>
    );
  }

  const path = smoothRoute(result.points);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MapRoutePreview
        mapSource={MAP}
        width={graph.meta.width}
        height={graph.meta.height}
        path={path}
        fromLabel={fromPOI.name}
        toLabel={toPOI.name}
        stats={result.stats}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  errorBody: {
    color: "#D1D5DB",
    fontSize: 15,
    textAlign: "center",
  },
});
