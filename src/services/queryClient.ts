import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, defaultShouldDehydrateQuery, focusManager, type Query } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/** How long a saved copy of the data may be shown while fresh data loads. */
export const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // realtime keeps things fresh; no need to refetch constantly
      gcTime: CACHE_MAX_AGE, // keep data around long enough to be saved and restored
      retry: 2,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Saves the query cache on the device (localStorage on web), so the next launch
 * shows the last known lists instantly and refreshes them in the background.
 * Signing out clears it (see the root layout).
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'veyra.query-cache.v1',
  throttleTime: 1000,
});

/**
 * Only plain JSON data is saved. A Map or Set would come back from storage as a plain
 * object and crash code that calls .get / .has on it, so those queries just refetch.
 */
export function shouldPersistQuery(query: Query): boolean {
  const data = query.state.data;
  return defaultShouldDehydrateQuery(query) && !(data instanceof Map) && !(data instanceof Set);
}

/** Bump to throw away caches saved by older versions of the app. */
export const CACHE_BUSTER = 'v2';

// Refetch stale data when the app comes back to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
}
