// Web Push for the browser version: one subscription per browser, saved on the server.
// The server (edge function "push") sends activity updates and reminders.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

/** Public VAPID key (safe to ship). The private half lives only in Supabase secrets. */
export const VAPID_PUBLIC_KEY = 'BNPhG7Ff33fDICydS3jK2bMhNcLvgpIqNSOJJrNZktuy2wNeg6VVJQPfEDfxLjPcyVI0gFSut3QaIfxmad9Q6m4';

export type WebPushState =
  | 'unsupported' // not a browser with Push API
  | 'install-first' // iPhone/iPad: works only after "Add to Home Screen"
  | 'denied' // the user blocked notifications for this site
  | 'off'
  | 'on';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

function isIOS() {
  if (!isWeb) return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function base64UrlToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Registers /sw.js once (web only). Safe to call many times. */
export async function registerServiceWorker() {
  if (!isWeb || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

async function currentSubscription() {
  const reg = await registerServiceWorker();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function readWebPushState(): Promise<WebPushState> {
  if (!isWeb) return 'unsupported';
  if (isIOS() && !isStandalone()) return 'install-first';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSubscription();
  return sub && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Ask permission, subscribe this browser, save it, and send a welcome notification. */
export async function enableWebPush(prefs: { activity: boolean; reminders: boolean }): Promise<WebPushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_activity: prefs.activity,
    p_reminders: prefs.reminders,
  });
  if (error) throw error;
  await supabase.functions.invoke('push', { body: { type: 'welcome', endpoint: json.endpoint } }).catch(() => {});
  return 'on';
}

export async function disableWebPush(): Promise<WebPushState> {
  const sub = await currentSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe().catch(() => {});
  }
  return 'off';
}

/** Per-browser choices, stored with the subscription on the server. */
export async function updateWebPushPrefs(prefs: Partial<{ activity: boolean; reminders: boolean }>) {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').update(prefs).eq('endpoint', sub.endpoint);
}

export async function readWebPushPrefs(): Promise<{ activity: boolean; reminders: boolean } | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  const { data } = await supabase.from('push_subscriptions').select('activity, reminders').eq('endpoint', sub.endpoint).maybeSingle();
  return data ?? null;
}

/** State + prefs for the settings screen. */
export function useWebPush() {
  const [state, setState] = useState<WebPushState>('unsupported');
  const [prefs, setPrefs] = useState({ activity: true, reminders: true });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const s = await readWebPushState();
    setState(s);
    if (s === 'on') {
      const p = await readWebPushPrefs();
      if (p) setPrefs(p);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<WebPushState>) => {
    setBusy(true);
    try {
      setState(await fn());
    } finally {
      setBusy(false);
    }
  };

  return {
    state,
    prefs,
    busy,
    enable: () => run(() => enableWebPush(prefs)),
    disable: () => run(disableWebPush),
    setPref: (key: 'activity' | 'reminders', value: boolean) => {
      setPrefs((p) => ({ ...p, [key]: value }));
      updateWebPushPrefs({ [key]: value }).catch(() => {});
    },
  };
}
