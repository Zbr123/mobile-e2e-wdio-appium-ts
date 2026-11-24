import { bffConfigured, env } from '../../src/config/env';
import { setFlagForUser } from '../../src/api/featureFlags';
import { appId } from '../../src/helpers/app';
import { ensureSignedIn } from '../../src/flows/session';
import { booking, bookingV2, home } from '../../src/screens/AppScreens';

/** The same journey on both sides of the `newBookingFlow` flag. */
for (const enabled of [true, false]) {
  describe(`Book appointment, newBookingFlow ${enabled ? 'ON' : 'OFF'}`, () => {
    const expected = enabled ? bookingV2 : booking;
    const other = enabled ? booking : bookingV2;

    before(async function () {
      if (!bffConfigured()) this.skip();
      await setFlagForUser(env.bff.tokenPrimary, 'newBookingFlow', enabled);
      await ensureSignedIn();
      // Flags are fetched at launch: restart so the app picks up the override.
      await driver.terminateApp(appId());
      await driver.activateApp(appId());
      await home.waitForShown(30_000);
    });

    after(async () => {
      if (bffConfigured()) await setFlagForUser(env.bff.tokenPrimary, 'newBookingFlow', null);
    });

    it(`PC-TC-40${enabled ? 1 : 2} opens the ${enabled ? 'new' : 'legacy'} booking flow`, async () => {
      await home.tapBook();
      await expected.waitForShown();
      await expect(other.root).not.toBeDisplayed();
    });
  });
}
