import { COLORS } from "@/lib/colors";
import { MapCatchPin, getMapCatchPins } from "@/lib/catches";
import { supabase } from "@/lib/supabase";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { ArrowLeft, MapPin } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ClusterMapView from "react-native-map-clustering";
import { Callout, Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_REGION: Region = {
  // Continental US center
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 45,
  longitudeDelta: 55,
};

function formatDisplayDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const mapRef = useRef<any>(null);
  const [pins, setPins] = useState<MapCatchPin[]>([]);
  const [loading, setLoading] = useState(true);

  // Request user location once — animate to it after map is ready
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("[map] location permission denied — using default region");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 3,
            longitudeDelta: 3,
          },
          600
        );
      } catch (e) {
        console.log("[map] location error:", e);
        // non-critical — stays on DEFAULT_REGION
      }
    };
    getLocation();
  }, []);

  // Refetch pins every time the screen comes into focus
  useEffect(() => {
    if (!isFocused) return;

    const fetchPins = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const data = await getMapCatchPins(user.id);
        setPins(data);
      } catch {
        // map still shows — pins just stay empty
      } finally {
        setLoading(false);
      }
    };

    fetchPins();
  }, [isFocused]);

  // Once pins load, fit map bounds to show all of them
  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return;
    mapRef.current.fitToCoordinates(
      pins.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      {
        edgePadding: { top: 100, right: 40, bottom: 100, left: 40 },
        animated: true,
      }
    );
  }, [pins]);

  return (
    <View style={styles.container}>
      <ClusterMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        clusterColor={COLORS.primary}
        clusterTextColor="#fff"
        clusterFontFamily={undefined}
        onMapReady={() => console.log("[map] Google Maps ready")}
        onError={(e: any) => console.log("[map] MapView error:", e)}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            pinColor={COLORS.primary}
          >
            <Callout tooltip style={styles.calloutTooltip}>
              <View style={styles.callout}>
                {!!pin.imageUrl && (
                  <Image
                    source={{ uri: pin.imageUrl }}
                    style={styles.calloutImage}
                    // prevent crash if URL is stale
                    onError={() => {}}
                  />
                )}
                <Text style={styles.calloutSpecies} numberOfLines={1}>
                  {pin.species}
                </Text>
                <Text style={styles.calloutDate}>
                  {formatDisplayDate(pin.date)}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </ClusterMapView>

      {/* Floating header */}
      <View
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "android" ? 8 : 4) }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => router.replace("/(tabs)/home")} style={styles.backButton}>
          <ArrowLeft color={COLORS.text} size={20} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Catch Map</Text>
        </View>

        <View style={styles.pinCountBadge}>
          <MapPin color={COLORS.primary} size={13} strokeWidth={2.4} />
          <Text style={styles.pinCountText}>{pins.length}</Text>
        </View>
      </View>

      {/* Loading spinner */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={COLORS.primary} size="small" />
        </View>
      )}

      {/* Empty state — shown over the map when there are no pins */}
      {!loading && pins.length === 0 && (
        <View style={[styles.emptyCard, { bottom: insets.bottom + 32 }]} pointerEvents="none">
          <MapPin color={COLORS.textSecondary} size={22} strokeWidth={1.5} />
          <View>
            <Text style={styles.emptyTitle}>No mapped catches yet</Text>
            <Text style={styles.emptySubtitle}>
              Allow location when logging a catch to pin it here.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  /* ── Floating header ─────────────────────────── */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(60,64,68,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  titleWrap: {
    flex: 1,
    backgroundColor: "rgba(60,64,68,0.88)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pinCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(60,64,68,0.88)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  pinCountText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  /* ── Callout ─────────────────────────────────── */
  calloutTooltip: {
    // tooltip=true means we own the entire callout bubble
  },
  callout: {
    backgroundColor: "#2B2E31",
    borderRadius: 12,
    padding: 10,
    width: 170,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    // Drop shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  calloutImage: {
    width: "100%",
    height: 88,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
    backgroundColor: "rgba(221,220,219,0.08)",
  },
  calloutSpecies: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  calloutDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  /* ── Loading overlay ─────────────────────────── */
  loadingOverlay: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(60,64,68,0.88)",
    borderRadius: 999,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  /* ── Empty state ─────────────────────────────── */
  emptyCard: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(60,64,68,0.92)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
