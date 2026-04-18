import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/lib/colors";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    error?: string;
    error_description?: string;
    error_code?: string;
  }>();

  useEffect(() => {
    // Supabase appends error params when a link is invalid or expired (e.g.
    // the user clicked a verification link a second time, or it timed out).
    // Redirect to the landing page so they can request a new link.
    if (params.error) {
      router.replace("/");
      return;
    }

    // If a session already exists when this screen mounts (e.g. the auth state
    // change fired before navigation landed here), redirect immediately.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/home");
      }
    });

    // Listen for the session becoming ready (covers the normal OAuth code-exchange path).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/home");
      }
    });

    // Safety net: if no session arrives within 8 seconds something went wrong
    // upstream. Redirect to landing so the user is never permanently stuck here.
    const fallback = setTimeout(() => {
      router.replace("/");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.text}>Finishing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.background,
  },
  text: {
    color: COLORS.text,
    fontSize: 16,
  },
});
