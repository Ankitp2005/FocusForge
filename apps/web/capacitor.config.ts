import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusforge.app',
  appName: 'FocusForge',
  webDir: 'dist',
  // NOTE FOR LOCAL DEVELOPMENT ONLY:
  // To use live-reload while testing, temporarily uncomment the server block below
  // and replace the URL with your current machine's local IP:
  //
  // server: {
  //   url: 'http://YOUR_LOCAL_IP:5173',
  //   androidScheme: 'http',
  //   cleartext: true,
  // },
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.supabase.co',
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
