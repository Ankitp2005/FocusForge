import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusforge.app',
  appName: 'FocusForge',
  webDir: 'dist',
  server: {
    url: 'http://10.122.31.247:5173',
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.clerk.accounts.dev',
      '*.clerk.com',
      'focusforge-frontend-9hi2.onrender.com',
      'localhost',
      'localhost:*'
    ]
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
