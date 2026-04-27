import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vwms.app',
  appName: 'VWMS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
