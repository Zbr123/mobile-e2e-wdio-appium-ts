import { sharedConfig } from './wdio.shared.conf';

/**
 * Real-device cloud run (BrowserStack App Automate) for the pre-release device matrix.
 * Upload builds first:  curl -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
 *   -X POST https://api-cloud.browserstack.com/app-automate/upload -F "file=@apps/petcare.apk"
 * then put the returned bs:// ids in BROWSERSTACK_ANDROID_APP / BROWSERSTACK_IOS_APP.
 *
 * Note: simulator-only steps (iOS `mobile: pushNotification`, `mobile: clearApp`) don't apply on
 * real devices; those specs switch to backend pushes / reinstall via IOS_REAL_DEVICE=true.
 */
const build = `petcare-${process.env.GITHUB_RUN_NUMBER ?? 'local'}`;
const bstack = (deviceName: string, platformVersion: string) => ({
  'bstack:options': {
    deviceName,
    platformVersion,
    projectName: 'PetCare mobile',
    buildName: build,
    debug: true,
    networkLogs: true,
    deviceLogs: true,
  },
});

export const config: WebdriverIO.Config = {
  ...sharedConfig,
  user: process.env.BROWSERSTACK_USERNAME,
  key: process.env.BROWSERSTACK_ACCESS_KEY,
  hostname: 'hub.browserstack.com',
  maxInstances: 3,
  services: [['browserstack', { browserstackLocal: false }]],
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app': process.env.BROWSERSTACK_ANDROID_APP,
      'appium:autoGrantPermissions': true,
      ...bstack('Samsung Galaxy S23', '13.0'),
    },
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app': process.env.BROWSERSTACK_ANDROID_APP,
      'appium:autoGrantPermissions': true,
      ...bstack('Google Pixel 8', '14.0'),
    },
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:app': process.env.BROWSERSTACK_IOS_APP,
      ...bstack('iPhone 15', '17'),
    },
  ] as WebdriverIO.Capabilities[],
};
