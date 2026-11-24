import { env } from '../config/env';

/** Appium app states returned by queryAppState. */
export const AppState = {
  NOT_INSTALLED: 0,
  NOT_RUNNING: 1,
  RUNNING_IN_BACKGROUND_SUSPENDED: 2,
  RUNNING_IN_BACKGROUND: 3,
  RUNNING_IN_FOREGROUND: 4,
} as const;

export const appId = (): string => (driver.isIOS ? env.ios.bundleId : env.android.appPackage);

export const appState = async (): Promise<number> => Number(await driver.queryAppState(appId()));

/** Kill the app and WAIT until the OS reports it stopped, so the next step is a true cold start. */
export async function ensureAppStopped(): Promise<void> {
  await driver.terminateApp(appId());
  await driver.waitUntil(async () => (await appState()) === AppState.NOT_RUNNING, {
    timeout: 10_000,
    timeoutMsg: 'App was still running 10s after terminateApp',
  });
}

/** Send the app to the background and keep it there (warm-start scenarios). */
export async function sendAppToBackground(): Promise<void> {
  await driver.execute('mobile: backgroundApp', { seconds: -1 });
  await driver.waitUntil(async () => (await appState()) !== AppState.RUNNING_IN_FOREGROUND, {
    timeout: 10_000,
    timeoutMsg: 'App was still in the foreground after backgroundApp',
  });
}

export async function bringAppToForeground(): Promise<void> {
  await driver.activateApp(appId());
  await driver.waitUntil(async () => (await appState()) === AppState.RUNNING_IN_FOREGROUND, {
    timeout: 15_000,
    timeoutMsg: 'App did not reach the foreground',
  });
}

/** Opens `<scheme>://<path>` in our app. Works for cold, warm and foreground starts. */
export async function openDeepLink(path: string): Promise<string> {
  const url = `${env.scheme}://${path.replace(/^\/+/, '')}`;
  await driver.deepLink(url, appId());
  return url;
}

/**
 * Wipe app data to get a signed-out state without reinstalling.
 *
 * Android: `pm clear` also REVOKES runtime permissions (e.g. POST_NOTIFICATIONS on Android 13+),
 * which brings the permission dialog back mid-test and makes taps land on the dialog.
 * Re-granting right after the clear removes that source of flakiness.
 */
export async function clearAppData(): Promise<void> {
  if (driver.isAndroid) {
    await driver.execute('mobile: clearApp', { appId: env.android.appPackage });
    await driver.execute('mobile: changePermissions', {
      permissions: 'all',
      appPackage: env.android.appPackage,
      action: 'grant',
    });
    return;
  }
  if (env.ios.realDevice) {
    // `mobile: clearApp` is simulator-only; on real devices reinstall to reset.
    await driver.removeApp(env.ios.bundleId);
    await driver.installApp(env.ios.appPath);
  } else {
    await driver.execute('mobile: clearApp', { bundleId: env.ios.bundleId });
    await driver.execute('mobile: setPermission', {
      bundleId: env.ios.bundleId,
      access: { notifications: 'yes' },
    });
  }
}
