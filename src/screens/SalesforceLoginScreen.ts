import { switchToChromeCustomTab, switchToNative } from '../helpers/contexts';
import { hideKeyboardIfShown } from '../helpers/keyboard';
import { iosPredicate } from '../helpers/selectors';
import { answerIosSignInPrompt } from '../helpers/systemDialogs';

/**
 * The Salesforce login page: the hybrid part of the journey.
 *
 * Android: Chrome Custom Tab  -> switch to WEBVIEW_chrome, use CSS ids, switch back.
 * iOS:     ASWebAuthenticationSession -> runs out-of-process, so it is NOT listed as a WEBVIEW
 *          context. Its page is still in the accessibility tree, so we drive it natively.
 *
 * Standard Salesforce login ids: #username, #password, #Login, #error.
 * (An Experience Cloud login page uses different ids; they would change only in this file.)
 */
const SALESFORCE_URL = /salesforce\.com|force\.com/;
const IOS = {
  username: iosPredicate('type == "XCUIElementTypeTextField"'),
  password: iosPredicate('type == "XCUIElementTypeSecureTextField"'),
  logIn: iosPredicate('type == "XCUIElementTypeButton" AND label == "Log In"'),
  error: iosPredicate('type == "XCUIElementTypeStaticText" AND label CONTAINS[c] "check your username and password"'),
  cancel: iosPredicate('type == "XCUIElementTypeButton" AND label == "Cancel"'),
};

class SalesforceLoginScreen {
  /** Fill and submit the form. Leaves the driver in NATIVE_APP context on both platforms. */
  async submit(username: string, password: string): Promise<void> {
    if (driver.isAndroid) {
      await switchToChromeCustomTab(SALESFORCE_URL);
      try {
        const user = $('#username');
        await user.waitForDisplayed({ timeout: 30_000 });
        await user.setValue(username);
        await $('#password').setValue(password);
        await $('#Login').click();
      } finally {
        await switchToNative();
      }
      return;
    }

    await answerIosSignInPrompt('Continue');
    const user = $(IOS.username);
    await user.waitForDisplayed({ timeout: 30_000 });
    await user.setValue(username);
    await $(IOS.password).setValue(password);
    await hideKeyboardIfShown();
    await $(IOS.logIn).click();
  }

  /** For negative tests: returns the error Salesforce shows and leaves the page open. */
  async errorText(): Promise<string> {
    if (driver.isAndroid) {
      await switchToChromeCustomTab(SALESFORCE_URL);
      try {
        const error = $('#error');
        await error.waitForDisplayed({ timeout: 15_000 });
        return await error.getText();
      } finally {
        await switchToNative();
      }
    }
    const error = $(IOS.error);
    await error.waitForDisplayed({ timeout: 15_000 });
    return (await error.getAttribute('label')) ?? '';
  }

  /** User backs out of the login page. */
  async cancel(): Promise<void> {
    if (driver.isAndroid) {
      await driver.back(); // closes the Custom Tab
    } else {
      await $(IOS.cancel).click();
    }
  }
}

export const salesforceLogin = new SalesforceLoginScreen();
