import { api } from '../api/client';

declare global {
  interface Window {
    siuuIsStandalone?: () => boolean;
  }
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.siuuIsStandalone) return window.siuuIsStandalone();
  } catch (_) {}
  return !!(
    (navigator as unknown as { standalone?: boolean }).standalone ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function permission(): NotificationPermission {
  if (typeof Notification === 'undefined') return 'default';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output.buffer as ArrayBuffer;
}

export async function requestAndSubscribe(): Promise<string> {
  try {
    if (!('Notification' in window)) return 'unsupported';
    if (!('serviceWorker' in navigator)) return 'unsupported';

    if (!isStandalone()) return 'ios_not_standalone';

    const perm = await Notification.requestPermission();
    if (perm === 'denied') return 'denied';
    if (perm !== 'granted') return 'default';

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const configRes = await api.config();
    const vapidKey = configRes.vapid_public_key;
    if (!vapidKey) return 'no_vapid';

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await api.pushSubscribe(sub.toJSON());
    return 'granted';
  } catch (err) {
    console.error('Push subscribe error:', err);
    return 'server_error';
  }
}
