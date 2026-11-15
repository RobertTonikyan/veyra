import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { HouseholdProvider, useHousehold } from '@/household/HouseholdProvider';
import { I18nProvider, useI18n } from '@/i18n';
import { queryClient } from '@/services/queryClient';
import { checkSupabaseConnection } from '@/services/supabase';
import { Button, Text, colors, space } from '@/ui';

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
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <HouseholdProvider>
            <RootNavigator />
          </HouseholdProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { ready: i18nReady, direction } = useI18n();
  const { session, loading: authLoading } = useAuth();
  const { household, ready: householdReady, error } = useHousehold();

  const signedIn = !!session;
  const hasHouse = !!household;
  const isReady = i18nReady && !authLoading && householdReady;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  useEffect(() => {
    if (__DEV__) checkSupabaseConnection();
  }, []);

  // Never show one account's cached data to the next account on this phone.
  useEffect(() => {
    if (!signedIn) queryClient.clear();
  }, [signedIn]);

  if (!isReady) return null;

  return (
    <View style={{ flex: 1, direction, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {signedIn && error ? (
        <LoadError />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          {/* signed out → sign in · signed in, no house → onboarding · otherwise → the app */}
          <Stack.Protected guard={signedIn && hasHouse}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn && !hasHouse}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
    </View>
  );
}

function LoadError() {
  const { t } = useI18n();
  const { refresh } = useHousehold();
  const [retrying, setRetrying] = useState(false);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.lg }}>
      <Text variant="heading" align="center" accessibilityRole="alert">
        {t('errors.loadFailed')}
      </Text>
      <Button
        label={t('common.retry')}
        loading={retrying}
        onPress={async () => {
          setRetrying(true);
          await refresh();
          setRetrying(false);
        }}
      />
    </View>
  );
}
