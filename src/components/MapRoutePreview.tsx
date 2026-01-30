import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ImageBackground,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import type { PathNode, RouteStats } from "../data/path/types";

type Props = {
  mapSource: any;
  width: number;
  height: number;
  path: PathNode[];
  fromLabel: string;
  toLabel: string;
  stats: RouteStats;
};

export default function MapRoutePreview({
  mapSource,
  width,
  height,
  path,
  fromLabel,
  toLabel,
  stats,
}: Props) {
  const router = useRouter();
  const ratio = width && height ? width / height : 1;
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const { polyline, start, end } = useMemo(() => {
    if (!path.length) return { polyline: "", start: null, end: null };
    const points = path.map((p) => `${p.x},${p.y}`).join(" ");
    return { polyline: points, start: path[0], end: path[path.length - 1] };
  }, [path]);

  const distanceKm = stats.meters ? (stats.meters / 1000).toFixed(2) : "0.00";
  const etaLabel = stats.minutes ? `${stats.minutes} min` : "–";

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width: layoutWidth, height: layoutHeight } = event.nativeEvent.layout;
    if (
      layoutWidth !== containerSize.width ||
      layoutHeight !== containerSize.height
    ) {
      setContainerSize({ width: layoutWidth, height: layoutHeight });
    }
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity
        style={styles.back}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.backText}>◀ Back</Text>
      </TouchableOpacity>

      <View style={[styles.mapWrap, { aspectRatio: ratio }]} onLayout={handleLayout}>
        <ScrollView
          style={styles.zoom}
          contentContainerStyle={[
            styles.zoomContent,
            containerSize.width
              ? { width: containerSize.width, height: containerSize.height }
              : null,
          ]}
          minimumZoomScale={1}
          maximumZoomScale={4}
          bouncesZoom
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={mapSource}
            style={[
              styles.map,
              containerSize.width
                ? { width: containerSize.width, height: containerSize.height }
                : null,
            ]}
            resizeMode="contain"
          >
            <Svg
              width={containerSize.width || "100%"}
              height={containerSize.height || "100%"}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              style={StyleSheet.absoluteFillObject}
            >
              {polyline ? (
                <Polyline
                  points={polyline}
                  stroke="#EF4444"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : null}
              {start ? (
                <Circle cx={start.x} cy={start.y} r={10} fill="#22C55E" />
              ) : null}
              {end ? (
                <Circle cx={end.x} cy={end.y} r={10} fill="#2563EB" />
              ) : null}
            </Svg>
          </ImageBackground>
        </ScrollView>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Route preview</Text>
        <Text style={styles.infoText}>From: {fromLabel}</Text>
        <Text style={styles.infoText}>To: {toLabel}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>{distanceKm} km</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>{etaLabel}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>{stats.steps} steps</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    paddingTop: 60,
  },
  back: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  mapWrap: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111827",
  },
  zoom: {
    flex: 1,
  },
  zoomContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  infoCard: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "#12131A",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  infoTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  infoText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statLabel: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
