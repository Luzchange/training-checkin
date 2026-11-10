import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'mil.training.checkin',
  appName: 'Training Check-In',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

