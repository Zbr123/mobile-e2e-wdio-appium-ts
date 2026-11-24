import { bffConfigured, env } from '../../src/config/env';
import { TestData, type Appointment } from '../../src/api/testData';
import { AppState, appState, ensureAppStopped, openDeepLink, sendAppToBackground } from '../../src/helpers/app';
import { ensureSignedIn, resetToSignedOut, signIn } from '../../src/flows/session';
import { appointmentDetail, welcome } from '../../src/screens/AppScreens';

describe('Deep links into an appointment', () => {
  const data = new TestData(env.bff.tokenPrimary);
  let appt: Appointment;

  before(async function () {
    if (!bffConfigured()) this.skip(); // needs the BFF to create its own appointment
    appt = await data.bookAppointment(await data.createPet());
  });

  after(async () => {
    await data.cleanup();
  });

  describe('signed in', () => {
    before(async () => {
      await ensureSignedIn();
    });

    it('PC-TC-101 @smoke cold start: opens the appointment from a killed app', async () => {
      await ensureAppStopped();
      await openDeepLink(`appointments/${appt.id}`);
      await appointmentDetail.waitForShown(45_000); // cold start includes loading the JS bundle
      await expect(appointmentDetail.petName).toHaveText(appt.pet.name);
    });

    it('PC-TC-102 warm start: opens the appointment with the app in the background', async () => {
      await sendAppToBackground();
      await openDeepLink(`appointments/${appt.id}`);
      await appointmentDetail.waitForShown();
      await expect(appointmentDetail.petName).toHaveText(appt.pet.name);
    });

    it('PC-TC-104 unknown id shows the not-found state, not a crash', async () => {
      await openDeepLink('appointments/does-not-exist');
      await expect(appointmentDetail.notFound).toBeDisplayed();
      expect(await appState()).toBe(AppState.RUNNING_IN_FOREGROUND);
    });
  });

  describe('signed out', () => {
    before(async () => {
      await resetToSignedOut();
    });

    it('PC-TC-103 routes through login, then lands on the appointment', async () => {
      await ensureAppStopped();
      await openDeepLink(`appointments/${appt.id}`);
      await welcome.waitForShown(45_000);
      await signIn();
      // Product decision to confirm: land on the target (asserted here) or drop to Home.
      await appointmentDetail.waitForShown(45_000);
      await expect(appointmentDetail.petName).toHaveText(appt.pet.name);
    });
  });
});
