import type { ExpoConfig } from 'expo/config';

/**
 * Config dynamique (remplace app.json) : seule différence avec un app.json statique,
 * `android.usesCleartextTraffic` — vrai uniquement pour le profil EAS "development"
 * (dev-client sur device physique, backend LAN en http://, voir src/api/config.ts),
 * jamais pour preview/production (mission OPTIMISATION.md §4 : HTTPS obligatoire en
 * clair bloqué). EAS_BUILD_PROFILE est injecté automatiquement par EAS Build ; absent
 * en local (`expo start`/`expo run:android` hors EAS) — cleartext reste alors désactivé,
 * ce qui n'affecte pas le simulateur/web (localhost) ni un test contre un backend https.
 */
const isDevelopmentProfile = process.env.EAS_BUILD_PROFILE === 'development';

// Pas d'annotation stricte ExpoConfig ici : `usesCleartextTraffic` (bien supporté par
// app.json/le config plugin Android d'Expo) manque du type @expo/config-types — le cast
// en sortie (`export default config as ExpoConfig`) évite un faux-positif TS sans perdre
// la vérification de type sur le reste du fichier.
const config = {
  name: 'PlanAI',
  slug: 'mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'mobile',
  userInterfaceStyle: 'automatic',
  // Explicite plutôt qu'implicite (déjà la valeur par défaut du SDK Expo 54) : bytecode
  // précompilé, GC et démarrage plus rapides qu'avec le moteur JSC — voir OPTIMISATION.md §2/3.
  jsEngine: 'hermes',
  ios: {
    bundleIdentifier: 'app.planai.mobile',
  },
  android: {
    package: 'app.planai.mobile',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    usesCleartextTraffic: isDevelopmentProfile,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#eef3ea',
        dark: { backgroundColor: '#0f1b14' },
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-localization',
    'expo-secure-store',
    'expo-font',
    'expo-web-browser',
    'expo-image',
    'expo-sharing',
    'expo-status-bar',
    [
      'expo-camera',
      { cameraPermission: 'PlanAI a besoin de la caméra pour identifier tes plantes en direct.' },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: "PlanAI a besoin d'accéder à tes photos pour ta story et le suivi de tes plantes.",
        cameraPermission: 'PlanAI a besoin de la caméra pour ta story et le suivi de tes plantes.',
      },
    ],
    [
      'expo-notifications',
      { icon: './assets/images/splash-icon.png', color: '#4ade80' },
    ],
    [
      'expo-location',
      { locationWhenInUsePermission: 'PlanAI a besoin de ta position pour géolocaliser tes découvertes (Geo-Tag).' },
    ],
    [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.238967658546-lcf2fgjcajqdces4pm9sh6vhi7tg6gt3' },
    ],
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: 'cb285673-015e-457b-9d2c-06a5c7b95d63',
    },
  },
};

export default config as ExpoConfig;
