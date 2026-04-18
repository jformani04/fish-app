import { router } from "expo-router";
import { Camera } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function ScanButton() {
  return (
    <Pressable
      onPress={() => router.push("/log/photoSelect")}
      style={styles.primaryBubble}
    >
      <View style={styles.primaryIcon}>
        <Camera size={32} color="#DDDCDB" />
      </View>
      <Text style={styles.primaryTitle}>Scan a Fish</Text>
      <Text style={styles.primarySubtitle}>
        Identify species & log your catch
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryBubble: {
    backgroundColor: "#FD7B41",
    borderRadius: 24,
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  primaryIcon: {
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    padding: 16,
    marginBottom: 14,
  },
  primaryTitle: {
    fontSize: 19,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  primarySubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 4,
  },
});
