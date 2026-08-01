import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nabd.execution',
  appName: 'نبض التنفيذ',
  webDir: 'dist',
  bundledWebRuntime: false,
  backgroundColor: '#eef4f1',
  android: {
    backgroundColor: '#eef4f1',
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: '#eef4f1',
    contentInset: 'automatic',
  },
  plugins: {
    LocalNotifications: {
      sound: 'beep.wav'
    }
  }
};

export default config;
