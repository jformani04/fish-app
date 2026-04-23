import { COLORS } from "@/lib/colors";
import { getSpeciesArticleWithCache, speciesNameToSlug } from "@/lib/speciesArticles";
import { router } from "expo-router";
import { BookOpen, ChevronRight } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";

type SpeciesGuideLinkProps = {
  speciesName?: string | null;
  style?: ViewStyle;
};

export default function SpeciesGuideLink({
  speciesName,
  style,
}: SpeciesGuideLinkProps) {
  const normalizedSpecies = useMemo(
    () => String(speciesName ?? "").trim(),
    [speciesName]
  );
  const [articleSlug, setArticleSlug] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;

    if (!normalizedSpecies) {
      setArticleSlug(null);
      return;
    }

    const slug = speciesNameToSlug(normalizedSpecies);
    if (!slug) {
      setArticleSlug(null);
      return;
    }

    const load = async () => {
      try {
        const result = await getSpeciesArticleWithCache(slug, (cachedArticle) => {
          if (!cancelled && cachedArticle) {
            setArticleSlug(cachedArticle.slug);
          }
        });

        if (!cancelled) {
          setArticleSlug(result.article?.slug ?? null);
        }
      } catch {
        if (!cancelled) {
          setArticleSlug(null);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [normalizedSpecies]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };

  if (!articleSlug) return null;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() =>
          router.push({
            pathname: "/articles/[slug]",
            params: { slug: articleSlug },
          })
        }
      >
        <View style={styles.iconWrap}>
          <BookOpen color={COLORS.primary} size={18} strokeWidth={2.2} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.linkTitle}>Species Guide</Text>
          <Text style={styles.linkSubtext}>Tap to view tips & info</Text>
        </View>
        <ChevronRight color={COLORS.primary} size={16} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  linkCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(253,123,65,0.3)",
    backgroundColor: "rgba(253,123,65,0.09)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  linkCardPressed: {
    backgroundColor: "rgba(253,123,65,0.17)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(253,123,65,0.15)",
    borderWidth: 1,
    borderColor: "rgba(253,123,65,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  linkSubtext: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
