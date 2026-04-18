import { Image, Text, View } from "react-native";
import { COLORS } from "@/lib/colors";

type AvatarProps = {
  uri?: string | null;
  username?: string | null;
  size?: number;
  borderColor?: string;
};

export default function Avatar({
  uri,
  username,
  size = 48,
  borderColor = COLORS.primary,
}: AvatarProps) {
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius, borderWidth: 2, borderColor }}
      />
    );
  }

  const letter = username?.trim().charAt(0).toUpperCase() || "?";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: "rgba(110,110,120,0.3)",
        borderWidth: 2,
        borderColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ color: COLORS.text, fontSize: size * 0.38, fontWeight: "700" }}
      >
        {letter}
      </Text>
    </View>
  );
}
