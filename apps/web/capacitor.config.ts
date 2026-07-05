import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.focusforge.app',
  appName: 'FocusForge',
  webDir: 'dist',
  server: {
    // ─── PRODUCTION: Load web content from Render frontend ───────────────
    // The APK is now a permanent shell. All UI/logic updates go live on
    // Render automatically on every git push — no APK rebuild or reinstall
    // needed for ANY frontend or backend change.
    // Only rebuild the APK when native config (this file, AndroidManifest,
    // or Capacitor plugins) actually changes.
    url: 'https://focusforge-frontend-9hi2.onrender.com',
    androidScheme: 'https',
    cleartext: false,
    // NOTE FOR LOCAL DEVELOPMENT: To test against a local dev server,
    // temporarily swap the url above with your machine's local IP:
    //   url: 'http://YOUR_LOCAL_IP:5173',
    //   androidScheme: 'http',
    //   cleartext: true,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;
