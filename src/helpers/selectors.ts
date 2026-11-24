/**
 * Selector rules for this suite
 *
 * 1. Elements in OUR app are found by React Native `testID` only.
 *    - iOS:     testID -> accessibilityIdentifier -> matched by `~id` (accessibility id strategy)
 *    - Android: testID -> resource-id without a package prefix (RN >= 0.64). `~id` would NOT match
 *               on Android (it reads content-desc), so we use UiSelector().resourceId() instead.
 *    If an element has no testID, the fix is a one-line PR to the app, not an XPath.
 * 2. No XPath and no fixed sleeps anywhere. `npm run lint:selectors` fails the build if either appears.
 * 3. Text/predicate selectors are allowed only for UI we don't own:
 *    system dialogs, the notification shade, and the Salesforce login page.
 */
export const byTestId = (testId: string): string =>
  driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`;

/** Shorthand used by every screen object. */
export const el = (testId: string) => $(byTestId(testId));

/** iOS class-chain / predicate helpers for system UI (alerts, auth session, notification banners). */
export const iosPredicate = (predicate: string): string => `-ios predicate string:${predicate}`;

/** Android UiSelector helper for system UI (permission dialogs, notification shade). */
export const uiSelector = (selector: string): string => `android=new UiSelector().${selector}`;
