import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { I18nProvider, useI18n } from '@/i18n';
import { checkSupabaseConnection } from '@/services/supabase';
import { colors } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <I18nProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </I18nProvider>
  );
}

function RootNavigator() {
  const { ready, direction } = useI18n();
  const { session, loading } = useAuth();
  const isReady = ready && !loading;
  const signedIn = !!session;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    if (__DEV__) checkSupabaseConnection();
  }, []);

  if (!isReady) return null;

  return (
    <View style={{ flex: 1, direction, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* Signed in → the app. Signed out → sign-in flow. Switching is automatic. */}
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
