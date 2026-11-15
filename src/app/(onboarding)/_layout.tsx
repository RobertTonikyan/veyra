import { Stack } from 'expo-router';

import { colors } from '@/ui/tokens';

export const unstable_settings = {
  initialRouteName: 'welcome',
};

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="create" />
      <Stack.Screen name="join" />
      {/* the house already exists here — no swiping back to "create" */}
      <Stack.Screen name="invite" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
