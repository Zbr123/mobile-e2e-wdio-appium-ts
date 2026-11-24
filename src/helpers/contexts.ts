/**
 * Native <-> web context switching for the Salesforce login.
 *
 * Android: the app opens Salesforce in a Chrome Custom Tab. A Custom Tab is Chrome's own process,
 *          so it appears as the `WEBVIEW_chrome` context, NOT `WEBVIEW_<our package>`.
 *          Appium then needs a Chromedriver that matches the device's Chrome version:
 *          the appium service runs with `uiautomator2:chromedriver_autodownload` and caches drivers in
 *          `.cache/chromedriver`, so a Chrome auto-update on the emulator doesn't break the run.
 * iOS:     see SalesforceLoginScreen; the auth session is driven through the native tree.
 */
const NATIVE = 'NATIVE_APP';
const CHROME_CONTEXT = 'WEBVIEW_chrome';

type ContextEntry = string | { id: string };
const contextId = (c: ContextEntry): string => (typeof c === 'string' ? c : c.id);

export async function waitForContext(match: (id: string) => boolean, timeout = 30_000): Promise<string> {
  let found = '';
  await driver.waitUntil(
    async () => {
      const contexts = (await driver.getContexts()) as ContextEntry[];
      found = contexts.map(contextId).find(match) ?? '';
      return Boolean(found);
    },
    {
      timeout,
      interval: 500,
      timeoutMsg: `No matching context after ${timeout}ms. Check that Chrome is installed and the emulator image is debuggable (google_apis).`,
    },
  );
  return found;
}

/**
 * Switch into the Custom Tab and select the Chrome tab whose URL matches.
 * Chrome can hold several tabs (an old session, the first-run page), so we pick by URL, not by index.
 */
export async function switchToChromeCustomTab(urlPattern: RegExp, timeout = 30_000): Promise<void> {
  await waitForContext((id) => id === CHROME_CONTEXT, timeout);
  await driver.switchAppiumContext(CHROME_CONTEXT);
  await driver.waitUntil(
    async () => {
      for (const handle of await driver.getWindowHandles()) {
        await driver.switchToWindow(handle);
        if (urlPattern.test(await driver.getUrl())) return true;
      }
      return false;
    },
    { timeout, interval: 500, timeoutMsg: `No Chrome tab matched ${urlPattern}` },
  );
}

/** Always hand control back to native: a spec that ends inside a webview poisons the next one. */
export async function switchToNative(): Promise<void> {
  if ((await driver.getContext()) !== NATIVE) {
    await driver.switchAppiumContext(NATIVE);
  }
}
