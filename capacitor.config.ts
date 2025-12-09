import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.runner',
  appName: 'Nexus Runner',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PinnedShortcuts: {
      enabled: true
    }
  }
};

export default config;
