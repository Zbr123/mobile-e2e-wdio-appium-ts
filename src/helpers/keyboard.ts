/**
 * The on-screen keyboard is the #1 cause of "element not clickable" flakes on small screens:
 * it covers the submit button only on some devices. Hide it only if it's shown, then WAIT for it
 * to be gone before the next tap.
 */
export async function hideKeyboardIfShown(): Promise<void> {
  if (!(await driver.isKeyboardShown())) return;

  if (driver.isIOS) {
    // iOS has no universal "hide" key; try the common return-key labels.
    await driver.execute('mobile: hideKeyboard', { keys: ['Done', 'Return', 'return', 'Go'] });
  } else {
    await driver.hideKeyboard();
  }

  await driver.waitUntil(async () => !(await driver.isKeyboardShown()), {
    timeout: 5_000,
    timeoutMsg: 'Keyboard was still covering the screen 5s after hiding it',
  });
}

/** Type into a field and make sure the keyboard is out of the way afterwards. */
export async function typeInto(field: ChainablePromiseElement, value: string): Promise<void> {
  await field.waitForDisplayed();
  await field.setValue(value);
  await hideKeyboardIfShown();
}

type ChainablePromiseElement = ReturnType<typeof $>;
