import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export function initNativeShell(): void {
  if (!Capacitor.isNativePlatform()) return;

  void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined);
  void StatusBar.setBackgroundColor({ color: '#FFF8F0' }).catch(() => undefined);

  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) {
      window.history.back();
      return;
    }
    void App.exitApp();
  });
}
