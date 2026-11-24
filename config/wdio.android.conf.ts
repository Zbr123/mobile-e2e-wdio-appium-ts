import path from 'node:path';
import { env } from '../src/config/env';
import { sharedConfig } from './wdio.shared.conf';

/**
 * Android: emulator by default, real device when ANDROID_UDID is set (`adb devices`).
 * Driver: UiAutomator2 8.x (the line that supports Appium 3; 9.x+ needs Appium 4).
 */
export const config: WebdriverIO.Config = {
  ...sharedConfig,
  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': env.android.udid ? 'Android Device' : 'Android Emulator',
      'appium:udid': env.android.udid,
      'appium:app': path.resolve(env.android.appPath),
      'appium:appPackage': env.android.appPackage,
      'appium:appWaitActivity': '*', // Expo/RN apps start through a splash activity
      'appium:newCommandTimeout': 240,

      // ---- flake prevention ----
      'appium:autoGrantPermissions': true, // no runtime-permission dialogs mid-test (POST_NOTIFICATIONS on 13+)
      'appium:disableWindowAnimation': true, // animations off: no "element moved" mis-taps
      'appium:hideKeyboard': true, // keyboard never covers buttons; typing still works

      // ---- hybrid (Chrome Custom Tabs) ----
      'appium:chromedriverExecutableDir': path.resolve('.cache/chromedriver'), // cached between CI runs
      'appium:recreateChromeDriverSessions': true, // fresh Chromedriver each time we enter a webview
      'appium:nativeWebScreenshot': true, // screenshots show the whole device, not just the web page
    } as WebdriverIO.Capabilities,
  ],
};
