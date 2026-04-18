import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { useFriends } from "@/auth/FriendsProvider";
import { COLORS } from "@/lib/colors";
import { CatchLog, getCatchStats, getUserCatchLogs } from "@/lib/catches";
import { FeedItem, getFriendFeed } from "@/lib/friends";
import { router } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Fish,
  LogOut,
  Map,
  MapPin,
  Ruler,
  User,
  Users,
  Weight,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ScanButton from "../../components/ScanButton";

const VIEW_CATCHES_ICON = require("@/assets/images/viewCatches.png");
const FAVORITES_ICON = require("@/assets/images/favorites.png");
const ARTICLES_ICON = require("@/assets/images/articles.png");
const TOTAL_CATCHES_ICON = require("@/assets/images/totalCatches.png");
const CLOCK_ICON = require("@/assets/images/clock.png");

function FeedAvatar({ url, size = 36 }: { url: string | null; size?: number }) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: COLORS.primary,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(253,123,65,0.15)",
        borderWidth: 2,
        borderColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <User size={size * 0.45} color={COLORS.primary} />
    </View>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const { profile, loading } = useAuth();
  const { friends, pendingRequests } = useFriends();
  const isFocused = useIsFocused();

  const [stats, setStats] = useState({ totalCatches: 0, speciesCount: 0 });
  const [recentCatch, setRecentCatch] = useState<CatchLog | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const H_PADDING = 48;
  const GAP = 16;
  const cardWidth = (width - H_PADDING - GAP) / 2;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace("/");
    }
  };

  const loadStats = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setStats({ totalCatches: 0, speciesCount: 0 });
      setRecentCatch(null);
      return;
    }
    const catches = await getUserCatchLogs(user.id);
    setStats(getCatchStats(catches));
    setRecentCatch(catches[0] ?? null);
  }, []);

  const loadFeed = useCallback(async () => {
    if (friends.length === 0) {
      setFeedItems([]);
      return;
    }
    setFeedLoading(true);
    try {
      const items = await getFriendFeed(friends.map((f) => f.id));
      setFeedItems(items);
    } catch (err) {
      console.log("[home] feed error", err);
      setFeedItems([]);
    } finally {
      setFeedLoading(false);
    }
  }, [friends]);

  useEffect(() => {
    if (!isFocused) return;

    const run = async () => {
      setStatsLoading(true);
      try {
        await loadStats();
      } catch {
        setStats({ totalCatches: 0, speciesCount: 0 });
        setRecentCatch(null);
      } finally {
        setStatsLoading(false);
      }
      loadFeed();
    };

    run();
  }, [isFocused, loadStats, loadFeed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStats(), loadFeed()]);
    } catch {
      // errors are swallowed in individual loaders
    } finally {
      setRefreshing(false);
    }
  }, [loadStats, loadFeed]);

  if (loading || statsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const hasPendingRequests = pendingRequests.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.push("/profile")}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <User size={28} color={COLORS.primary} />
              </View>
            )}
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Anglr</Text>
            <Text style={styles.subtitle}>
              Welcome back
              {profile?.username ? `, ${profile.username}` : ""}!
            </Text>
          </View>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      <ScanButton />

      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.rowGrid}>
        <Pressable
          style={[styles.actionBubble, styles.actionBubbleCentered, { width: cardWidth }]}
          onPress={() => router.push("/catches")}
        >
          <View style={styles.actionIconCentered}>
            <Image source={VIEW_CATCHES_ICON} style={styles.actionIconImage} />
          </View>
          <Text style={[styles.actionText, styles.actionTextCentered]}>View Catches</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBubble, styles.actionBubbleCentered, { width: cardWidth }]}
          onPress={() => router.push("/favorites")}
        >
          <View style={styles.actionIconCentered}>
            <Image source={FAVORITES_ICON} style={styles.actionIconImage} />
          </View>
          <Text style={[styles.actionText, styles.actionTextCentered]}>Favorites</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.fullBubble, styles.fullBubbleCentered]}
        onPress={() => router.push("/articles")}
      >
        <View style={styles.actionIconCentered}>
          <Image
            source={ARTICLES_ICON}
            style={[styles.actionIconImage, styles.speciesGuideIconImage]}
          />
        </View>
        <View style={styles.fullBubbleContentCentered}>
          <Text style={[styles.actionText, styles.actionTextCentered]}>Species Guide</Text>
          <Text style={[styles.actionSubtext, styles.actionTextCentered]}>Browse and learn</Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.fullBubble, styles.fullBubbleCentered]}
        onPress={() => router.push("/map")}
      >
        <View style={[styles.actionIconCentered, { height: 60 }]}>
          <Map size={48} color={COLORS.primary} strokeWidth={1.5} />
        </View>
        <View style={styles.fullBubbleContentCentered}>
          <Text style={[styles.actionText, styles.actionTextCentered]}>Catch Map</Text>
          <Text style={[styles.actionSubtext, styles.actionTextCentered]}>View catches on a map</Text>
        </View>
      </Pressable>

      {/* Friends bubble with notification badge */}
      <Pressable
        style={[styles.fullBubble, styles.fullBubbleCentered]}
        onPress={() => router.push("/friends")}
      >
        <View style={[styles.actionIconCentered, styles.badgeWrap, { height: 60 }]}>
          <Users size={48} color={COLORS.primary} strokeWidth={1.5} />
          {hasPendingRequests && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {pendingRequests.length > 9 ? "9+" : pendingRequests.length}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.fullBubbleContentCentered}>
          <Text style={[styles.actionText, styles.actionTextCentered]}>Friends</Text>
          <Text style={[styles.actionSubtext, styles.actionTextCentered]}>
            {hasPendingRequests
              ? `${pendingRequests.length} pending request${pendingRequests.length > 1 ? "s" : ""}`
              : "Connect with other anglers"}
          </Text>
        </View>
      </Pressable>

      {/* Your Stats */}
      <Text style={styles.sectionLabel}>Your Stats</Text>
      <View style={styles.rowGrid}>
        <View style={[styles.statBubble, { width: cardWidth }]}>
          <View style={styles.row}>
            <View style={styles.statIcon}>
              <Image source={TOTAL_CATCHES_ICON} style={styles.statIconImage} />
            </View>
            <Text style={styles.statLabel}>Total Catches</Text>
          </View>
          <Text style={styles.statValue}>{stats.totalCatches}</Text>
        </View>

        <View style={[styles.statBubble, { width: cardWidth }]}>
          <View style={styles.row}>
            <View style={styles.statIcon}>
              <Fish size={28} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Species</Text>
          </View>
          <Text style={styles.statValue}>{stats.speciesCount}</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionLabel}>Recent Activity</Text>
      <View style={styles.activityBubble}>
        <View style={styles.row}>
          <View style={styles.actionIcon}>
            <Image source={CLOCK_ICON} style={styles.activityIconImage} />
          </View>
          <View style={styles.activityContent}>
            {recentCatch ? (
              <>
                <Text style={styles.activityTitle}>
                  Last catch: {recentCatch.species || "Unknown Species"}
                </Text>
                <View style={styles.activityMetaRow}>
                  <Ruler size={12} color={COLORS.primary} />
                  <Text style={styles.activityMetaText}>
                    {recentCatch.length || "-"}
                  </Text>
                  <Text style={styles.activityMetaDot}>•</Text>
                  <Weight size={12} color={COLORS.primary} />
                  <Text style={styles.activityMetaText}>
                    {recentCatch.weight || "-"}
                  </Text>
                </View>
                <View style={styles.activityMetaRow}>
                  <MapPin size={12} color={COLORS.primary} />
                  <Text style={styles.activityMetaText} numberOfLines={1}>
                    {recentCatch.location || "Unknown location"}
                  </Text>
                  <Text style={styles.activityMetaDot}>•</Text>
                  <Calendar size={12} color={COLORS.primary} />
                  <Text style={styles.activityMetaText} numberOfLines={1}>
                    {recentCatch.date || "No date"}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.activityTitle}>No recent activity</Text>
                <Text style={styles.activitySub}>
                  Start by scanning your first catch
                </Text>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Friends Feed */}
      <Text style={styles.sectionLabel}>Friends Feed</Text>

      {feedLoading ? (
        <View style={styles.feedEmptyCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.feedEmptyText}>Loading feed...</Text>
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.feedEmptyCard}>
          <Users size={32} color={COLORS.textSecondary} strokeWidth={1.5} />
          <Text style={styles.feedEmptyTitle}>No friends yet</Text>
          <Text style={styles.feedEmptyText}>
            Add friends to see their catches here.
          </Text>
          <Pressable
            style={styles.feedEmptyAction}
            onPress={() => router.push("/friends")}
          >
            <Text style={styles.feedEmptyActionText}>Find Anglers</Text>
          </Pressable>
        </View>
      ) : feedItems.length === 0 ? (
        <View style={styles.feedEmptyCard}>
          <Fish size={32} color={COLORS.textSecondary} strokeWidth={1.5} />
          <Text style={styles.feedEmptyTitle}>Nothing yet</Text>
          <Text style={styles.feedEmptyText}>
            Your friends haven't logged any public catches yet.
          </Text>
        </View>
      ) : (
        <View style={styles.feedList}>
          {feedItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.feedCard}
              onPress={() => router.push(`/user/${item.userId}`)}
            >
              {/* Angler row */}
              <View style={styles.feedAnglerRow}>
                <FeedAvatar url={item.avatarUrl} size={32} />
                <Text style={styles.feedAnglerName}>{item.username}</Text>
                <Text style={styles.feedDate}>{item.date}</Text>
              </View>

              {/* Catch content */}
              <View style={styles.feedCatchRow}>
                {!!item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.feedThumb}
                  />
                )}
                <View style={styles.feedCatchContent}>
                  <Text style={styles.feedSpecies} numberOfLines={1}>
                    {item.species || "Unknown Species"}
                  </Text>
                  {(!!item.length || !!item.weight) && (
                    <Text style={styles.feedMeta}>
                      {[item.length, item.weight].filter(Boolean).join(" • ")}
                    </Text>
                  )}
                  {!!item.location && (
                    <View style={styles.feedLocationRow}>
                      <MapPin size={11} color={COLORS.textSecondary} />
                      <Text style={styles.feedLocation} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },

  header: {
    paddingTop: 48,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(253,123,65,0.2)",
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 32,
    color: COLORS.text,
    fontWeight: "700",
    letterSpacing: -1,
  },

  subtitle: {
    color: COLORS.primary,
    fontSize: 14,
    marginTop: 4,
  },

  signOutButton: {
    padding: 12,
    borderRadius: 999,
    backgroundColor: "rgba(221,220,219,0.1)",
    borderWidth: 1,
    borderColor: "rgba(221,220,219,0.2)",
  },

  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  rowGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  actionBubble: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionBubbleCentered: {
    alignItems: "center",
    justifyContent: "center",
  },

  fullBubble: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  fullBubbleCentered: {
    alignItems: "center",
    justifyContent: "center",
  },

  actionIcon: {
    padding: 0,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginBottom: 8,
    alignSelf: "flex-start",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconCentered: {
    width: 80,
    height: 80,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  badgeWrap: {
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  actionIconImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  speciesGuideIconImage: {
    transform: [{ scale: 1.5 }],
  },

  actionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  actionTextCentered: {
    textAlign: "center",
  },

  actionSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  statBubble: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "white",
  },

  statIcon: {
    padding: 0,
    borderRadius: 999,
    backgroundColor: "transparent",
    marginRight: 8,
  },
  statIconImage: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },

  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  statValue: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },

  activityBubble: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "white",
    marginBottom: 24,
  },

  activityTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "500",
  },

  activitySub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  activityMetaText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flexShrink: 1,
  },
  activityMetaDot: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  activityIconImage: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    transform: [{ scale: 1.25 }],
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  fullBubbleContentCentered: {
    alignItems: "center",
    justifyContent: "center",
  },

  activityContent: {
    flex: 1,
  },

  // Feed
  feedEmptyCard: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  feedEmptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  feedEmptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  feedEmptyAction: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  feedEmptyActionText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
  },
  feedList: {
    gap: 10,
  },
  feedCard: {
    backgroundColor: "rgba(221,220,219,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  feedAnglerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedAnglerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  feedDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flexShrink: 0,
  },
  feedCatchRow: {
    flexDirection: "row",
    gap: 10,
  },
  feedThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    resizeMode: "cover",
  },
  feedCatchContent: {
    flex: 1,
    gap: 3,
  },
  feedSpecies: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },
  feedMeta: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  feedLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  feedLocation: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flexShrink: 1,
  },
});
