import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.langolfenterprises.vwms',
  appName: 'VWMS Smart Warehouse',
  webDir: 'dist',
  backgroundColor: '#ebe7dfff',
  loggingBehavior: 'none',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    App: {
      disableBackButtonHandler: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#ebe7dfff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ebe7df',
      overlaysWebView: false,
    },
  },
};

export default config;
