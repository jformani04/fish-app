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
    borderRadius: 36,
    alignItems: "center",
    padding: 28,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "white",
  },
  primaryIcon: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 18,
    marginBottom: 16,
  },
  primaryTitle: {
    fontSize: 20,
    color: "#DDDCDB",
    fontWeight: "600",
  },
  primarySubtitle: {
    color: "rgba(221,220,219,0.9)",
    fontSize: 14,
    marginTop: 4,
  },
});
