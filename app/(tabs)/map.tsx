import { COLORS } from "@/lib/colors";
import { CatchLog, getUserCatchLogs } from "@/lib/catches";
import { supabase } from "@/lib/supabase";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { ArrowLeft, MapPin } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DEFAULT_REGION = {
  latitude: 41.238,
  longitude: -81.841,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

function hasValidCoordinates(catchLog: CatchLog) {
  const latitude = Number(catchLog.latitude);
  const longitude = Number(catchLog.longitude);

  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

export default function CatchMapScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const mapRef = useRef<MapView>(null);
  const [catches, setCatches] = useState<CatchLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFocused) return;

    const loadCatches = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setCatches([]);
          return;
        }

        const rows = await getUserCatchLogs(user.id);
        setCatches(rows.filter(hasValidCoordinates));
      } catch (error) {
        console.log("MAP ERROR", error);
        setCatches([]);
      } finally {
        setLoading(false);
      }
    };

    loadCatches();
  }, [isFocused]);

  const markerData = useMemo(
    () =>
      catches.map((catchLog) => ({
        ...catchLog,
        latitude: Number(catchLog.latitude),
        longitude: Number(catchLog.longitude),
      })),
    [catches]
  );

  useEffect(() => {
    if (!mapRef.current || markerData.length === 0) return;

    mapRef.current.fitToCoordinates(
      markerData.map((catchLog) => ({
        latitude: catchLog.latitude,
        longitude: catchLog.longitude,
      })),
      {
        edgePadding: {
          top: 120,
          right: 48,
          bottom: 120,
          left: 48,
        },
        animated: true,
      }
    );
  }, [markerData]);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centeredText}>Loading catch map...</Text>
      </View>
    );
  }

  if (markerData.length === 0) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.centeredText}>No catches yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        onMapReady={() => console.log("MAP READY")}
        onError={(e) => console.log("MAP ERROR", e.nativeEvent)}
      >
        {markerData.map((catchLog) => (
          <Marker
            key={catchLog.id}
            coordinate={{
              latitude: catchLog.latitude,
              longitude: catchLog.longitude,
            }}
            title={catchLog.species || "Catch"}
            description={catchLog.weight ? `${catchLog.weight} lbs` : ""}
            onPress={() => console.log(catchLog.id)}
          />
        ))}
      </MapView>

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "android" ? 8 : 4) },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => router.replace("/(tabs)/home")}
          style={styles.backButton}
        >
          <ArrowLeft color={COLORS.text} size={20} strokeWidth={2.4} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Catch Map</Text>
        </View>

        <View style={styles.countBadge}>
          <MapPin color={COLORS.primary} size={14} strokeWidth={2.2} />
          <Text style={styles.countText}>{markerData.length}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  centeredText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
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
    alignItems: "center",
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(60,64,68,0.88)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  countText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
