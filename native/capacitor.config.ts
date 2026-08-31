import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Capacitor configuration for the App Store and Play Store builds
 *
 * Copy this to frontend/capacitor.config.ts once the native shell is added.
 * It lives here for now so the web build does not carry a dependency it has
 * no use for
 */
const config: CapacitorConfig = {
  appId: 'com.mihaimicle.fitnesstracker',
  appName: 'FitnessTracker',

  /* Where `next build` with BUILD_TARGET=native leaves the static export */
  webDir: 'out',

  server: {
    /*
     * The app is served from the device, so its origin is capacitor://localhost
     * on iOS and http://localhost on Android. Both are in the CORS allow list
     * in backend/main.py, and adding a new one means adding it there too
     */
    androidScheme: 'http',
    iosScheme: 'capacitor',
  },

  ios: {
    contentInset: 'always',
  },

  android: {
    /*
     * Health Connect is a separate app on Android 9 to 13 and ships with the
     * system on 14 and later, so the minimum sensible target is API 28
     */
    allowMixedContent: false,
  },
};

export default config;
