import { env } from '../config/env';
import { iosPredicate, uiSelector } from './selectors';

export interface TestPush {
  title: string;
  body: string;
  /** Deep link the app should open when the notification is tapped. */
  url: string;
}

/**
 * How a push gets onto the device in each environment:
 * - iOS simulator: `mobile: pushNotification` (simctl push). No APNs, no backend, instant.
 * - Android emulator / real devices: a REAL push through Expo's push service, using the device's
 *   Expo push token. In the real project this would be the BFF's / Marketing Cloud's test endpoint
 *   so the full server path is covered too.
 */
export async function sendPush(push: TestPush): Promise<void> {
  if (driver.isIOS && !env.ios.realDevice) {
    await driver.execute('mobile: pushNotification', {
      bundleId: env.ios.bundleId,
      payload: {
        aps: { alert: { title: push.title, body: push.body }, sound: 'default' },
        // expo-notifications reads custom data from the `body` key on iOS.
        body: { url: push.url },
      },
    });
    return;
  }
  await sendViaExpoPushService(push);
}

async function sendViaExpoPushService(push: TestPush): Promise<void> {
  const token = env.android.expoPushToken;
  if (!token) throw new Error('EXPO_PUSH_TOKEN_ANDROID is not set (see .env.example)');

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      to: token,
      title: push.title,
      body: push.body,
      data: { url: push.url },
      priority: 'high',
      channelId: 'default',
    }),
  });
  const json = (await res.json()) as { data?: { status: string; message?: string } };
  if (!res.ok || json.data?.status !== 'ok') {
    throw new Error(`Expo push failed (${res.status}): ${JSON.stringify(json)}`);
  }
}

/**
 * Tap the notification once it arrives. The notification shade / banner is system UI,
 * so text matching is the only option here (see selector rules in selectors.ts).
 */
export async function tapNotification(title: string, timeout = 45_000): Promise<void> {
  if (driver.isAndroid) {
    await driver.openNotifications();
    const item = $(uiSelector(`textContains("${title}")`));
    await item.waitForDisplayed({ timeout, timeoutMsg: `Notification "${title}" never arrived in the shade` });
    await item.click();
    return;
  }
  // iOS: with the app killed or backgrounded, SpringBoard is the active app and owns the banner.
  const banner = $(iosPredicate(`label CONTAINS[c] "${title}"`));
  await banner.waitForDisplayed({ timeout, timeoutMsg: `Notification banner "${title}" never appeared` });
  await banner.click();
}
