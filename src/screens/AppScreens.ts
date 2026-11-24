import { el } from '../helpers/selectors';
import { BaseScreen } from './BaseScreen';

/** Signed-out landing screen. */
class WelcomeScreen extends BaseScreen {
  protected readonly rootId = 'welcome-screen';
  get signInButton() {
    return el('welcome-sign-in-button');
  }
  async tapSignIn(): Promise<void> {
    await this.signInButton.waitForEnabled();
    await this.signInButton.click();
  }
}

class HomeScreen extends BaseScreen {
  protected readonly rootId = 'home-screen';
  get greeting() {
    return el('home-greeting');
  }
  get bookButton() {
    return el('home-book-appointment-button');
  }
  appointmentCard(id: string) {
    return el(`appointment-card-${id}`);
  }
  async tapBook(): Promise<void> {
    await this.bookButton.waitForEnabled();
    await this.bookButton.click();
  }
}

class AppointmentDetailScreen extends BaseScreen {
  protected readonly rootId = 'appointment-detail-screen';
  get petName() {
    return el('appointment-detail-pet-name');
  }
  get notFound() {
    return el('appointment-detail-not-found');
  }
}

/** Legacy booking flow (flag OFF). */
class BookingScreen extends BaseScreen {
  protected readonly rootId = 'booking-screen';
}

/** New booking flow behind `newBookingFlow` (flag ON). */
class BookingV2Screen extends BaseScreen {
  protected readonly rootId = 'booking-v2-screen';
}

export const welcome = new WelcomeScreen();
export const home = new HomeScreen();
export const appointmentDetail = new AppointmentDetailScreen();
export const booking = new BookingScreen();
export const bookingV2 = new BookingV2Screen();
