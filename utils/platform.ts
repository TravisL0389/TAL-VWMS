import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

interface PlatformHandlers {
  onBack: () => boolean;
  onNetworkChange: (connected: boolean) => void;
}

export const isNativeApp = Capacitor.isNativePlatform();

export async function initializePlatform({ onBack, onNetworkChange }: PlatformHandlers): Promise<() => void> {
  const handles: PluginListenerHandle[] = [];
  const reportBrowserNetwork = () => onNetworkChange(navigator.onLine);

  window.addEventListener('online', reportBrowserNetwork);
  window.addEventListener('offline', reportBrowserNetwork);
  reportBrowserNetwork();

  if (isNativeApp) {
    document.documentElement.dataset.platform = Capacitor.getPlatform();

    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#ebe7df' });
      }

      const status = await Network.getStatus();
      onNetworkChange(status.connected);
      handles.push(await Network.addListener('networkStatusChange', next => onNetworkChange(next.connected)));

      if (Capacitor.getPlatform() === 'android') {
        handles.push(await CapacitorApp.addListener('backButton', async () => {
          if (!onBack()) await CapacitorApp.exitApp();
        }));
      }
    } finally {
      await SplashScreen.hide().catch(() => undefined);
    }
  }

  const hapticOnTap = (event: PointerEvent) => {
    if (!isNativeApp || event.pointerType === 'mouse') return;
    const target = event.target instanceof Element
      ? event.target.closest('button:not(:disabled), [role="button"]:not([aria-disabled="true"])')
      : null;
    if (target) void Haptics.selectionChanged().catch(() => undefined);
  };
  document.addEventListener('pointerup', hapticOnTap, { passive: true });

  return () => {
    window.removeEventListener('online', reportBrowserNetwork);
    window.removeEventListener('offline', reportBrowserNetwork);
    document.removeEventListener('pointerup', hapticOnTap);
    handles.forEach(handle => void handle.remove());
  };
}
