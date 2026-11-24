import { env, type TestUser } from '../config/env';
import { appId, clearAppData } from '../helpers/app';
import { home, welcome } from '../screens/AppScreens';
import { waitForFirstOf } from '../screens/BaseScreen';
import { salesforceLogin } from '../screens/SalesforceLoginScreen';

/** Full hybrid sign-in: native Welcome -> Salesforce (web) -> native Home. */
export async function signIn(user: TestUser = env.users.primary): Promise<void> {
  if (!user.username || !user.password) throw new Error('E2E_USER / E2E_PASSWORD are not set');
  await welcome.waitForShown();
  await welcome.tapSignIn();
  await salesforceLogin.submit(user.username, user.password);
}

/** Clean, signed-out app on the Welcome screen. */
export async function resetToSignedOut(): Promise<void> {
  await clearAppData();
  await driver.activateApp(appId());
  await welcome.waitForShown(30_000);
}

/** Signed in and on Home. Only signs in when needed, so suites don't pay for login every test. */
export async function ensureSignedIn(user: TestUser = env.users.primary): Promise<void> {
  await driver.activateApp(appId());
  const screen = await waitForFirstOf([home, welcome]);
  if (screen === welcome) {
    await signIn(user);
    await home.waitForShown(45_000);
  }
}
