import { el } from '../helpers/selectors';

/**
 * Every screen has a root view with a testID (e.g. `home-screen`).
 * "Screen is shown" means that root is displayed: one reliable wait instead of guessing with sleeps.
 */
export abstract class BaseScreen {
  protected abstract readonly rootId: string;

  get root() {
    return el(this.rootId);
  }

  async waitForShown(timeout = 20_000): Promise<this> {
    await this.root.waitForDisplayed({
      timeout,
      timeoutMsg: `${this.constructor.name} (${this.rootId}) was not shown within ${timeout}ms`,
    });
    return this;
  }

  async isShown(): Promise<boolean> {
    return this.root.isDisplayed();
  }
}

/** Wait until ONE of several screens appears and return it (e.g. Home vs Welcome after launch). */
export async function waitForFirstOf<T extends BaseScreen>(screens: T[], timeout = 30_000): Promise<T> {
  let shown: T | undefined;
  await driver.waitUntil(
    async () => {
      for (const screen of screens) {
        if (await screen.isShown()) {
          shown = screen;
          return true;
        }
      }
      return false;
    },
    {
      timeout,
      interval: 500,
      timeoutMsg: `None of [${screens.map((s) => s.constructor.name).join(', ')}] appeared within ${timeout}ms`,
    },
  );
  return shown!;
}
