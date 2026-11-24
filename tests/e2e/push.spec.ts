import { bffConfigured, env } from '../../src/config/env';
import { TestData, type Appointment } from '../../src/api/testData';
import { ensureAppStopped, sendAppToBackground } from '../../src/helpers/app';
import { sendPush, tapNotification, type TestPush } from '../../src/helpers/push';
import { ensureSignedIn } from '../../src/flows/session';
import { appointmentDetail } from '../../src/screens/AppScreens';

describe('Push notification opens the right screen', () => {
  const data = new TestData(env.bff.tokenPrimary);
  let appt: Appointment;
  let push: TestPush;

  before(async function () {
    const canPush = driver.isIOS ? !env.ios.realDevice : Boolean(env.android.expoPushToken);
    if (!bffConfigured() || !canPush) this.skip();

    appt = await data.bookAppointment(await data.createPet());
    push = {
      // Unique title so we never tap a notification left over from an earlier run.
      title: `Reminder ${appt.id.slice(-6)}`,
      body: `${appt.pet.name} has a check-up coming up`,
      url: `${env.scheme}://appointments/${appt.id}`,
    };
    await ensureSignedIn();
  });

  after(async () => {
    await data.cleanup();
  });

  it('PC-TC-301 @smoke cold start: tapping the reminder on a killed app opens the appointment', async () => {
    await ensureAppStopped();
    await sendPush(push);
    await tapNotification(push.title);
    await appointmentDetail.waitForShown(45_000);
    await expect(appointmentDetail.petName).toHaveText(appt.pet.name);
  });

  it('PC-TC-302 background: tapping the reminder opens the appointment', async () => {
    await sendAppToBackground();
    await sendPush(push);
    await tapNotification(push.title);
    await appointmentDetail.waitForShown();
    await expect(appointmentDetail.petName).toHaveText(appt.pet.name);
  });
});
