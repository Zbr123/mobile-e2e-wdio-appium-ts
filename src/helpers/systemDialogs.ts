import { iosPredicate, uiSelector } from './selectors';

/**
 * iOS: ASWebAuthenticationSession (used by expo-auth-session / openAuthSessionAsync) first shows
 *   “<App>” Wants to Use “salesforce.com” to Sign In   [Cancel] [Continue]
 * We do NOT use autoAcceptAlerts: this prompt is part of the user journey, so the test handles it
 * explicitly (and the "Cancel" path is its own test case).
 */
export async function answerIosSignInPrompt(button: 'Continue' | 'Cancel', timeout = 15_000): Promise<void> {
  const fallbackButton = $(iosPredicate(`type == "XCUIElementTypeButton" AND label == "${button}"`));
  let viaAlertApi = false;

  await driver.waitUntil(
    async () => {
      try {
        const buttons = (await driver.execute('mobile: alert', { action: 'getButtons' })) as string[];
        viaAlertApi = buttons.includes(button);
        if (viaAlertApi) return true;
      } catch {
        // No alert registered with the app; the prompt may be owned by SpringBoard. Try the element.
      }
      return fallbackButton.isDisplayed();
    },
    { timeout, interval: 300, timeoutMsg: `iOS sign-in prompt with "${button}" did not appear` },
  );

  if (viaAlertApi) {
    await driver.execute('mobile: alert', { action: button === 'Continue' ? 'accept' : 'dismiss', buttonLabel: button });
  } else {
    await fallbackButton.click();
  }
}

/**
 * Safety net for Android runtime permission dialogs. Permissions are granted up front
 * (autoGrantPermissions + re-grant after clearApp), so in a healthy run this is a no-op.
 * If it ever fires, that's a signal something revoked permissions and is logged.
 */
export async function allowAndroidPermissionIfShown(): Promise<boolean> {
  const allow = $(uiSelector('resourceIdMatches(".*:id/permission_allow_button")'));
  if (await allow.isDisplayed()) {
    console.warn('[systemDialogs] Unexpected Android permission dialog — tapped Allow.');
    await allow.click();
    return true;
  }
  return false;
}
