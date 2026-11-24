import 'dotenv/config';

const read = (name: string, fallback = ''): string => process.env[name]?.trim() || fallback;

/** One place for every environment-specific value, so specs never read process.env directly. */
export const env = {
  scheme: read('APP_SCHEME', 'petcare'),
  android: {
    appPackage: read('ANDROID_APP_PACKAGE', 'com.example.petcare'),
    appPath: read('ANDROID_APP_PATH', './apps/petcare.apk'),
    udid: read('ANDROID_UDID') || undefined,
    expoPushToken: read('EXPO_PUSH_TOKEN_ANDROID'),
  },
  ios: {
    bundleId: read('IOS_BUNDLE_ID', 'com.example.petcare'),
    appPath: read('IOS_APP_PATH', './apps/PetCare.app'),
    udid: read('IOS_UDID') || undefined,
    deviceName: read('IOS_DEVICE_NAME', 'iPhone 16'),
    platformVersion: read('IOS_PLATFORM_VERSION') || undefined,
    realDevice: read('IOS_REAL_DEVICE') === 'true',
    xcodeOrgId: read('IOS_XCODE_ORG_ID') || undefined,
  },
  users: {
    primary: { username: read('E2E_USER'), password: read('E2E_PASSWORD') },
    secondary: { username: read('E2E_USER_2'), password: read('E2E_PASSWORD_2') },
  },
  bff: {
    url: read('BFF_URL'),
    graphqlPath: read('GRAPHQL_PATH', '/graphql'),
    tokenPrimary: read('E2E_API_TOKEN'),
    tokenSecondary: read('E2E_API_TOKEN_2'),
  },
} as const;

export type TestUser = (typeof env.users)[keyof typeof env.users];

export const bffConfigured = (): boolean => Boolean(env.bff.url && env.bff.tokenPrimary);
