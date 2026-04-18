import { COLORS } from "@/lib/colors";
import { CatchLog, getUserCatchLogs } from "@/lib/catches";
import { FriendMapPin, getFriendMapPins } from "@/lib/friends";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useFriends } from "@/auth/FriendsProvider";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { ArrowLeft, MapPin, X } from "lucide-react-native";
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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterMode = "mine" | "friends";

// Internal rich pin — includes all fields needed for the callout card
type RichPin = {
  id: string;
  species: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  date: string;
  weight: string;
  length: string;
  userId: string | null;  // null = current user's own catch
  username: string;
  avatarUrl: string | null;
};

const DEFAULT_REGION = {
  latitude: 41.238,
  longitude: -81.841,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

function hasValidCoords(c: CatchLog) {
  return (
    Number.isFinite(Number(c.latitude)) &&
    Number.isFinite(Number(c.longitude))
  );
}

function fromFriendPin(p: FriendMapPin): RichPin {
  return {
    id: p.id,
    species: p.species,
    latitude: p.latitude,
    longitude: p.longitude,
    imageUrl: p.imageUrl,
    date: p.date,
    weight: p.weight,
    length: p.length,
    userId: p.userId,
    username: p.username,
    avatarUrl: p.avatarUrl,
  };
}

export default function CatchMapScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const mapRef = useRef<MapView>(null);
  const { profile } = useAuth();
  const { friends } = useFriends();

  const [filterMode, setFilterMode] = useState<FilterMode>("mine");
  const [myPins, setMyPins] = useState<RichPin[]>([]);
  const [friendPins, setFriendPins] = useState<RichPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState<RichPin | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    const loadAll = async () => {
      setLoading(true);
      setSelectedPin(null);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setMyPins([]);
          setFriendPins([]);
          return;
        }

        const rows = await getUserCatchLogs(user.id);
        const mine: RichPin[] = rows
          .filter(hasValidCoords)
          .map((c) => ({
            id: c.id,
            species: c.species,
            latitude: Number(c.latitude),
            longitude: Number(c.longitude),
            imageUrl: c.imageUrl,
            date: c.date,
            weight: c.weight,
            length: c.length,
            userId: null,
            username: profile?.username ?? "Me",
            avatarUrl: profile?.avatar_url ?? null,
          }));
        setMyPins(mine);

        const friendIds = friends.map((f) => f.id);
        const fPins = await getFriendMapPins(friendIds);
        setFriendPins(fPins.map(fromFriendPin));
      } catch (err) {
        console.log("MAP ERROR", err);
        setMyPins([]);
        setFriendPins([]);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [isFocused, friends, profile]);

  const activePins = filterMode === "mine" ? myPins : friendPins;

  useEffect(() => {
    if (!mapRef.current || activePins.length === 0) return;
    mapRef.current.fitToCoordinates(
      activePins.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
      { edgePadding: { top: 160, right: 48, bottom: 160, left: 48 }, animated: true }
    );
  }, [activePins]);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centeredText}>Loading catch map...</Text>
      </View>
    );
  }

  if (activePins.length === 0) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.centeredText}>
          {filterMode === "mine" ? "No catches yet" : "No friend catches to show"}
        </Text>
        <Text style={styles.centeredSub}>
          {filterMode === "mine"
            ? "Log a catch with a location to see it here."
            : "Friends' catches marked Public will appear here."}
        </Text>
        <View style={{ marginTop: 24 }}>
          <FilterToggle mode={filterMode} onChange={setFilterMode} />
        </View>
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
        onPress={() => setSelectedPin(null)}
        onMapReady={() => console.log("MAP READY")}
        onError={(e) => console.log("MAP ERROR", e.nativeEvent)}
      >
        {activePins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            pinColor={filterMode === "friends" ? "#4488ff" : undefined}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedPin(pin);
            }}
          />
        ))}
      </MapView>

      {/* Top header */}
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
          <FilterToggle mode={filterMode} onChange={setFilterMode} />
        </View>

        <View style={styles.countBadge}>
          <MapPin color={COLORS.primary} size={14} strokeWidth={2.2} />
          <Text style={styles.countText}>{activePins.length}</Text>
        </View>
      </View>

      {/* Callout card */}
      {selectedPin && (
        <View style={[styles.calloutCard, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.calloutRow}>
            {/* Catch image */}
            {selectedPin.imageUrl ? (
              <Image source={{ uri: selectedPin.imageUrl }} style={styles.calloutImage} />
            ) : (
              <View style={[styles.calloutImage, styles.calloutImageFallback]}>
                <MapPin color={COLORS.textSecondary} size={20} strokeWidth={1.5} />
              </View>
            )}

            {/* Catch details */}
            <View style={styles.calloutDetails}>
              <Text style={styles.calloutSpecies} numberOfLines={1}>
                {selectedPin.species || "Unknown Species"}
              </Text>
              {(!!selectedPin.length || !!selectedPin.weight) && (
                <Text style={styles.calloutMeasure}>
                  {[selectedPin.length, selectedPin.weight]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
              {!!selectedPin.date && (
                <Text style={styles.calloutDate}>{selectedPin.date}</Text>
              )}
            </View>

            {/* Close button */}
            <Pressable style={styles.calloutClose} onPress={() => setSelectedPin(null)}>
              <X color={COLORS.textSecondary} size={18} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Angler row — only for friends' pins */}
          {selectedPin.userId !== null && (
            <Pressable
              style={styles.calloutAnglerRow}
              onPress={() => {
                setSelectedPin(null);
                router.push(`/user/${selectedPin.userId}`);
              }}
            >
              {selectedPin.avatarUrl ? (
                <Image
                  source={{ uri: selectedPin.avatarUrl }}
                  style={styles.calloutAvatar}
                />
              ) : (
                <View style={[styles.calloutAvatar, styles.calloutAvatarFallback]}>
                  <Text style={styles.calloutAvatarInitial}>
                    {selectedPin.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.calloutAnglerName}>{selectedPin.username}</Text>
                <Text style={styles.calloutAnglerSub}>Tap to view profile →</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function FilterToggle({
  mode,
  onChange,
}: {
  mode: FilterMode;
  onChange: (m: FilterMode) => void;
}) {
  return (
    <View style={toggleStyles.wrap}>
      <Pressable
        style={[toggleStyles.btn, mode === "mine" && toggleStyles.active]}
        onPress={() => onChange("mine")}
      >
        <Text style={[toggleStyles.label, mode === "mine" && toggleStyles.labelActive]}>
          Mine
        </Text>
      </Pressable>
      <Pressable
        style={[toggleStyles.btn, mode === "friends" && toggleStyles.active]}
        onPress={() => onChange("friends")}
      >
        <Text
          style={[toggleStyles.label, mode === "friends" && toggleStyles.labelActive]}
        >
          Friends
        </Text>
      </Pressable>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: "rgba(60,64,68,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 3,
  },
  btn: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  active: {
    backgroundColor: COLORS.primary,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  labelActive: {
    color: "#000",
  },
});

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
    gap: 8,
  },
  centeredText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  centeredSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
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
    alignItems: "center",
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
  // Callout card
  calloutCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  calloutImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    resizeMode: "cover",
  },
  calloutImageFallback: {
    backgroundColor: "rgba(221,220,219,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutDetails: {
    flex: 1,
    gap: 3,
  },
  calloutSpecies: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "700",
  },
  calloutMeasure: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  calloutDate: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  calloutClose: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(221,220,219,0.1)",
  },
  calloutAnglerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(221,220,219,0.06)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 10,
  },
  calloutAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.primary,
    resizeMode: "cover",
  },
  calloutAvatarFallback: {
    backgroundColor: "rgba(253,123,65,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  calloutAvatarInitial: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  calloutAnglerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  calloutAnglerSub: {
    color: COLORS.primary,
    fontSize: 11,
    marginTop: 1,
  },
});
