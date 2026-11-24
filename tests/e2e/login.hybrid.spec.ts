import { env } from '../../src/config/env';
import { resetToSignedOut, signIn } from '../../src/flows/session';
import { home, welcome } from '../../src/screens/AppScreens';
import { salesforceLogin } from '../../src/screens/SalesforceLoginScreen';

/**
 * Hybrid journey: native Welcome -> Salesforce login (Custom Tab / ASWebAuthenticationSession) -> native Home.
 * AIO Tests case keys are in the titles (PC-TC-xxx) so JUnit results map 1:1 to the test cycle.
 */
describe('Sign in with Salesforce (hybrid)', () => {
  beforeEach(async () => {
    await resetToSignedOut();
  });

  it('PC-TC-001 @smoke signs in and lands on Home', async () => {
    await signIn();
    await home.waitForShown(45_000);
    await expect(home.greeting).toBeDisplayed();
    // Control must be back in native after the web step, or the next spec starts in the wrong context.
    expect(await driver.getContext()).toBe('NATIVE_APP');
  });

  it('PC-TC-002 shows the Salesforce error and stays signed out for a wrong password', async () => {
    await welcome.tapSignIn();
    await salesforceLogin.submit(env.users.primary.username, 'definitely-wrong-password');
    expect(await salesforceLogin.errorText()).toMatch(/check your username and password/i);
    await salesforceLogin.cancel();
    await welcome.waitForShown();
  });

  it('PC-TC-003 returns to Welcome when the user cancels sign-in', async () => {
    await welcome.tapSignIn();
    await salesforceLogin.cancel();
    await welcome.waitForShown();
    await expect(home.root).not.toBeDisplayed();
  });
});
