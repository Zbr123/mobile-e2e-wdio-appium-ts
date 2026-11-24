import { collectEvidence, startRecording } from '../src/helpers/evidence';

/**
 * Settings shared by every target (Android, iOS, BrowserStack).
 * Platform configs add `capabilities` (and BrowserStack replaces `services`).
 */
export const sharedConfig: Omit<WebdriverIO.Config, 'capabilities'> = {
  runner: 'local',
  specs: ['../tests/e2e/**/*.spec.ts'],
  maxInstances: 1, // one local device; BrowserStack config raises this
  logLevel: 'warn',
  outputDir: './reports/wdio-logs',

  // Default for every waitFor*. Specs never call pause(); `npm run lint:selectors` enforces it.
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000, // first session builds WebDriverAgent / installs the APK
  connectionRetryCount: 1,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 5 * 60_000,
    // No automatic retries: a test that needs a retry to pass has a bug (in the test or the app),
    // and a retry would hide it. Flaky tests get quarantined with a ticket, not retried.
    retries: 0,
  },

  reporters: [
    'spec',
    // JUnit XML imports into an AIO Tests cycle; titles carry the AIO case keys (PC-TC-xxx).
    ['junit', { outputDir: './reports/junit', outputFileFormat: (o) => `results-${o.cid}.xml` }],
  ],

  services: [
    [
      'appium',
      {
        args: {
          // Appium 3: insecure features must be scoped to a driver (or `*`).
          // Lets Appium download the Chromedriver that matches the device's Chrome (Custom Tabs).
          allowInsecure: 'uiautomator2:chromedriver_autodownload',
          log: './reports/appium.log',
        },
      },
    ],
  ],

  beforeTest: async () => {
    await startRecording();
  },

  afterTest: async (test, _context, { passed }) => {
    await collectEvidence(`${test.parent} ${test.title}`, passed);
  },
};
