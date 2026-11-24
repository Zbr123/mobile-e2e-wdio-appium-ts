import path from 'node:path';
import { env } from '../src/config/env';
import { sharedConfig } from './wdio.shared.conf';

/**
 * iOS: simulator by default (EAS `ios.simulator: true` build, a .app),
 * real device when IOS_UDID + IOS_XCODE_ORG_ID are set (an .ipa signed for that device).
 * Driver: XCUITest 12.x (the line that supports Appium 3; 13.x needs Appium 4).
 */
export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [
    {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': env.ios.deviceName,
      'appium:platformVersion': env.ios.platformVersion, // pin to an installed runtime: xcrun simctl list runtimes
      'appium:udid': env.ios.udid,
      'appium:app': path.resolve(env.ios.appPath),
      'appium:bundleId': env.ios.bundleId,
      'appium:newCommandTimeout': 240,
      'appium:wdaLaunchTimeout': 120_000,
      'appium:derivedDataPath': path.resolve('.cache/wda'), // reuse the WebDriverAgent build between runs

      // ---- flake prevention ----
      // Simulator: pre-grant notifications so the permission alert never steals a tap (needs applesimutils).
      'appium:permissions': JSON.stringify({ [env.ios.bundleId]: { notifications: 'YES' } }),
      // System alerts are handled explicitly: the Salesforce "Wants to Use ... to Sign In" prompt is a test step.
      'appium:autoAcceptAlerts': false,
      'appium:reduceMotion': true, // fewer animation-timing flakes
      'appium:connectHardwareKeyboard': false, // the software keyboard behaves like a user's phone

      // ---- real device signing (ignored on simulators) ----
      'appium:xcodeOrgId': env.ios.xcodeOrgId,
      'appium:xcodeSigningId': env.ios.xcodeOrgId ? 'Apple Development' : undefined,
    } as WebdriverIO.Capabilities,
  ],
};
