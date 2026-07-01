import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusforge.app',
  appName: 'FocusForge',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'focusforge-frontend-9hi2.onrender.com',
      'localhost',
      'localhost:*'
    ]
  }
};

export default config;
