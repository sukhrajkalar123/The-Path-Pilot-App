// app/lost.tsx
import { Stack, useRouter } from "expo-router";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { loadGraph } from "../src/data/path/loadGraph";

type PickedImage = { uri: string; base64?: string | null };

type AiResult = {
  guess?: string;
  candidates: string[];
  confidence?: number;
  evidence?: string[];
};

const norm = (s: string) => s.trim().toLowerCase();

function getDevServerHost() {
  const fromExpoConfig = Constants.expoConfig?.hostUri;
  const fromManifest2 = Constants.manifest2?.extra?.expoClient?.hostUri;
  const fromManifest = Constants.manifest?.debuggerHost || Constants.manifest?.hostUri;
  const hostUri = fromExpoConfig || fromManifest2 || fromManifest;
  if (!hostUri) return null;
  const cleaned = hostUri.replace(/^https?:\/\//, "").split("/")[0];
  return cleaned.split(":")[0];
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  (() => {
    const host = getDevServerHost();
    return host ? `http://${host}:8787` : "http://localhost:8787";
  })();

function filterPois(poiNames: string[], query: string, limit = 8): string[] {
  const q = norm(query);
  if (!q) return poiNames.slice(0, limit);
  return poiNames
    .filter((name) => norm(name).includes(q))
    .sort((a, b) => a.length - b.length)
    .slice(0, limit);
}

function mapToPoiName(poiNames: string[], input?: string | null) {
  if (!input) return null;
  const target = norm(input);
  if (!target) return null;
  const exact = poiNames.find((n) => norm(n) === target);
  if (exact) return exact;
  const partial =
    poiNames.find((n) => norm(n).includes(target)) ??
    poiNames.find((n) => target.includes(norm(n)));
  return partial ?? null;
}

function guessMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function imageToDataUrl(image: PickedImage) {
  const mime = guessMimeType(image.uri);
  if (image.base64) {
    return `data:${mime};base64,${image.base64}`;
  }
  const encoding = FileSystem.EncodingType.Base64;
  const base64 = await FileSystem.readAsStringAsync(image.uri, {
    encoding,
  });
  return `data:${mime};base64,${base64}`;
}

async function prepareImage(
  asset: ImagePicker.ImagePickerAsset
): Promise<PickedImage> {
  try {
    const targetWidth = 1024;
    const actions =
      asset.width && asset.width > targetWidth ? [{ resize: { width: targetWidth } }] : [];
    const result = await ImageManipulator.manipulateAsync(asset.uri, actions, {
      compress: 0.6,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });
    return { uri: result.uri, base64: result.base64 };
  } catch {
    return { uri: asset.uri, base64: asset.base64 };
  }
}

async function checkProxyHealth(baseUrl: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function LostScreen() {
  const router = useRouter();
  const graph = useMemo(() => loadGraph(), []);
  const poiNames = useMemo(
    () => graph.pois.map((p) => p.name).sort((a, b) => a.localeCompare(b)),
    [graph]
  );
  const poiNameMap = useMemo(
    () => new Map(poiNames.map((n) => [norm(n), n])),
    [poiNames]
  );
  const resolvePoi = useCallback(
    (input?: string | null) => {
      if (!input) return null;
      return poiNameMap.get(norm(input)) ?? null;
    },
    [poiNameMap]
  );

  const [images, setImages] = useState<PickedImage[]>([]);
  const [toQuery, setToQuery] = useState("");
  const [toName, setToName] = useState<string | null>(null);
  const [fromName, setFromName] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const toSuggestions = useMemo(
    () => filterPois(poiNames, toQuery, 8),
    [poiNames, toQuery]
  );
  const canStart = useMemo(() => {
    const resolvedTo = resolvePoi(toName) ?? resolvePoi(toQuery);
    const resolvedFrom = resolvePoi(fromName) ?? resolvePoi(aiResult?.guess ?? null);
    return !!resolvedTo && !!resolvedFrom;
  }, [toName, toQuery, fromName, aiResult, resolvePoi]);
  const networkHint =
    (aiError?.includes("Network request failed") || aiError?.includes("timed out")) &&
    "Make sure the proxy is running and EXPO_PUBLIC_API_BASE_URL points to your computer’s LAN IP (not localhost).";

  async function addFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsMultipleSelection: false,
      selectionLimit: 1,
      base64: true,
    });
    if (!result.canceled) {
      const picked = await Promise.all(result.assets.map((a) => prepareImage(a)));
      setImages((prev) => [...prev, ...picked]);
    }
  }

  async function addFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      base64: true,
    });
    if (!result.canceled) {
      const prepared = await prepareImage(result.assets[0]);
      setImages((prev) => [...prev, prepared]);
    }
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  }

  async function analyzeWithAI() {
    if (images.length === 0) {
      Alert.alert("Add a photo", "Please add at least one photo to analyze.");
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const proxyOk = await checkProxyHealth(API_BASE_URL);
      if (!proxyOk) {
        setAiError(
          "Can’t reach the proxy. Make sure it’s running and your phone can access your Mac on the same Wi‑Fi."
        );
        return;
      }

      const dataUrls = await Promise.all(images.slice(0, 1).map((img) => imageToDataUrl(img)));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(`${API_BASE_URL}/vision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: dataUrls,
          poiNames,
          hints: {},
          answers: {},
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Vision request failed");
      }

      const parsed = await response.json();
      const nextResult: AiResult = {
        guess: parsed.guess,
        candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : undefined,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      };
      setAiResult(nextResult);

      const mapped = mapToPoiName(poiNames, nextResult.guess);
      if (mapped) setFromName(mapped);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setAiError("Request timed out. Try again on strong Wi‑Fi.");
      } else {
        setAiError(error?.message ?? "Vision request failed");
      }
    } finally {
      setAiLoading(false);
    }
  }

  function startRoute() {
    const resolvedTo = resolvePoi(toName) ?? resolvePoi(toQuery);
    const resolvedFrom = resolvePoi(fromName) ?? resolvePoi(aiResult?.guess ?? null);

    if (!resolvedTo) {
      Alert.alert("Pick your destination", "Choose a destination from the list.");
      return;
    }
    if (!resolvedFrom) {
      Alert.alert("Run AI", "Tap Analyze so we can detect your location.");
      return;
    }

    router.push({
      pathname: "/navigate",
      params: {
        from: resolvedFrom,
        to: resolvedTo,
        accessible: "0",
      },
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "I’m Lost (AI)",
          headerTintColor: "#fff",
          headerStyle: { backgroundColor: "black" },
        }}
      />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.push("/")}
          activeOpacity={0.8}
        >
          <Text style={styles.backText}>◀ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>I’m Lost (AI)</Text>
        <Text style={styles.subtitle}>
          Add a photo and I’ll try to identify where you are in the PATH.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1) Add a photo</Text>
          <Text style={styles.cardHint}>Signs or storefronts work best.</Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.button} onPress={addFromCamera}>
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonGhost} onPress={addFromLibrary}>
              <Text style={styles.buttonGhostText}>Choose Photos</Text>
            </TouchableOpacity>
          </View>
          {images.length > 0 && (
            <View style={styles.photoRow}>
              {images.map((img) => (
                <View key={img.uri} style={styles.photoWrap}>
                  <Image source={{ uri: img.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => removeImage(img.uri)}
                  >
                    <Text style={styles.photoRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2) Where do you want to go?</Text>
          <TextInput
            style={styles.input}
            placeholder="Start typing a destination"
            placeholderTextColor="#6B7280"
            value={toQuery}
            onChangeText={(text) => {
              setToQuery(text);
              setToName(null);
            }}
          />
          <View style={styles.rowWrap}>
            {toSuggestions.map((name) => (
              <Chip
                key={name}
                label={name}
                selected={toName === name}
                onPress={() => {
                  setToName(name);
                  setToQuery(name);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>3) AI result</Text>
          <Text style={styles.cardHint}>We’ll detect your current location.</Text>
          <TouchableOpacity
            style={[styles.buttonPrimary, aiLoading && styles.buttonDisabled]}
            onPress={analyzeWithAI}
            disabled={aiLoading}
          >
            <Text style={styles.buttonPrimaryText}>
              {aiLoading ? "Analyzing..." : "Analyze with Vision AI"}
            </Text>
          </TouchableOpacity>

          {aiError && <Text style={styles.errorText}>AI error: {aiError}</Text>}
          {networkHint && <Text style={styles.errorText}>{networkHint}</Text>}

          {fromName && (
            <Text style={styles.selectionText}>Detected near: {fromName}</Text>
          )}
          {!fromName && aiResult?.candidates?.length ? (
            <>
              <Text style={styles.sectionLabel}>Pick the closest match</Text>
              <View style={styles.rowWrap}>
                {aiResult.candidates
                  .map((c) => mapToPoiName(poiNames, c))
                  .filter((c): c is string => !!c)
                  .map((name) => (
                    <Chip
                      key={name}
                      label={name}
                      selected={fromName === name}
                      onPress={() => setFromName(name)}
                    />
                  ))}
              </View>
            </>
          ) : null}

          {aiResult?.confidence !== undefined && (
            <Text style={styles.aiMeta}>
              Confidence: {Math.round(aiResult.confidence * 100)}%
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primary, !canStart && styles.buttonDisabled]}
          onPress={startRoute}
          disabled={!canStart}
        >
          <Text style={styles.primaryText}>Start Route</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 10,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#12131A",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },
  cardHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  buttonGhost: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonGhostText: {
    color: "white",
    fontWeight: "600",
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  photoWrap: {
    position: "relative",
  },
  photo: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: {
    color: "white",
    fontSize: 16,
    lineHeight: 18,
  },
  input: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0B0B0F",
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  chipActive: {
    backgroundColor: "white",
  },
  chipText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#0B0B0F",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 12,
  },
  selectionText: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 10,
    fontSize: 12,
  },
  primary: {
    marginTop: 4,
    backgroundColor: "#22C55E",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    color: "#0B0B0F",
    fontWeight: "800",
    fontSize: 16,
  },
  back: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPrimary: {
    marginTop: 14,
    backgroundColor: "#0EA5E9",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonPrimaryText: {
    color: "white",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: "#FCA5A5",
    marginTop: 10,
    fontSize: 12,
  },
  aiMeta: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 10,
    fontSize: 12,
  },
});
