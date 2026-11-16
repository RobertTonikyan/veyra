import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { NotificationPrefs } from './plan';

// These choices live on this phone only (reminders are scheduled by the phone itself).
// The morning summary is the exception: it is saved on the profile (reminders_on / reminder_time).

const KEY = 'veyra.notifications.v1';
const DEFAULTS: NotificationPrefs = { birthdays: true, chores: true, events: true };

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'undetermined';

type State = { prefs: NotificationPrefs; loaded: boolean; permission: PermissionState };

let state: State = { prefs: DEFAULTS, loaded: false, permission: 'unknown' };
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!state.loaded) void load();
  return () => listeners.delete(l);
}

let loading: Promise<void> | null = null;
function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      const saved = raw ? (JSON.parse(raw) as Partial<NotificationPrefs>) : {};
      emit({ prefs: { ...DEFAULTS, ...saved }, loaded: true });
    })
    .catch(() => emit({ loaded: true }));
  return loading;
}

export function setNotificationPref(key: keyof NotificationPrefs, value: boolean) {
  const prefs = { ...state.prefs, [key]: value };
  emit({ prefs });
  AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
}

export function setPermissionState(permission: PermissionState) {
  if (permission !== state.permission) emit({ permission });
}

export function useNotificationPrefs(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
