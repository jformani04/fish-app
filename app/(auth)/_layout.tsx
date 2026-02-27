import { Stack } from "expo-router";
import "react-native-reanimated";;


export default function RootNavigator() {
  return (
    <Stack>
      <Stack.Screen name="forgot_password" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}


