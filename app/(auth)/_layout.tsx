import { Stack } from "expo-router";
import "react-native-reanimated";


export default function RootNavigator() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}


