import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { HouseholdProvider, useHousehold } from '@/household/HouseholdProvider';
import { I18nProvider, useI18n } from '@/i18n';
import { CACHE_MAX_AGE, queryClient, queryPersister } from '@/services/queryClient';
import { checkSupabaseConnection } from '@/services/supabase';
import { Button, Text, colors, space } from '@/ui';

SplashScreen.preventAutoHideAsync();

/**
 * Web only: paint the browser around the app in the app's color.
 * Without this, mobile Safari shows a white bar above the app (status bar area / overscroll).
 */
function paintBrowserChrome() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.backgroundColor = colors.bg;
  root.style.colorScheme = 'dark';
  document.body.style.backgroundColor = colors.bg;

  const meta = (name: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };
  meta('theme-color', colors.bg);
  meta('color-scheme', 'dark');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  meta('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}
paintBrowserChrome();

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: CACHE_MAX_AGE, buster: 'v1' }}
    >
      <I18nProvider>
        <AuthProvider>
          <HouseholdProvider>
            <RootNavigator />
          </HouseholdProvider>
        </AuthProvider>
      </I18nProvider>
    </PersistQueryClientProvider>
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* On a wide browser window the app stays phone-width, centered. */}
      <View style={[{ flex: 1, direction, backgroundColor: colors.bg }, Platform.OS === 'web' && WEB_FRAME]}>
      <StatusBar style="light" />
      {signedIn && error ? (
        <LoadError />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          {/* signed out → sign in · signed in, no house → onboarding · otherwise → the app */}
          <Stack.Protected guard={signedIn && hasHouse}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="meals" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="us" />
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
    </View>
  );
}

const WEB_FRAME = {
  width: '100%',
  maxWidth: 520,
  alignSelf: 'center',
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderColor: colors.hairline,
} as const;

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
