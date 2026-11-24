# Mobile E2E + API suite: WebdriverIO 9 · Appium 3 · TypeScript · Mocha

A reference suite for a React Native / Expo app with a Salesforce login, deep links, push notifications and a NestJS GraphQL BFF.
It shows how I structure, stabilise and run this kind of suite on emulators, simulators, real devices and in CI.

> The app under test is a placeholder (`com.example.petcare`, scheme `petcare://`, testIDs like `home-screen`).
> Point the variables in `.env.example` at a real build and the suite runs as is.

## What's covered, and where

| Area | Where |
|---|---|
| Page objects (one root testID per screen, no sleeps) | [`src/screens`](src/screens) |
| **Hybrid login**: native → Chrome Custom Tab (`WEBVIEW_chrome`) / iOS `ASWebAuthenticationSession` → native | [`SalesforceLoginScreen.ts`](src/screens/SalesforceLoginScreen.ts), [`contexts.ts`](src/helpers/contexts.ts), [`login.hybrid.spec.ts`](tests/e2e/login.hybrid.spec.ts) |
| Chromedriver matched to the device's Chrome automatically (Appium 3 scoped insecure feature) | [`wdio.shared.conf.ts`](config/wdio.shared.conf.ts), [`wdio.android.conf.ts`](config/wdio.android.conf.ts) |
| **Deep links**: cold start, warm start, signed-out, unknown id | [`deeplinks.spec.ts`](tests/e2e/deeplinks.spec.ts) |
| **Push notifications**: killed + background, tap → correct screen | [`push.ts`](src/helpers/push.ts), [`push.spec.ts`](tests/e2e/push.spec.ts) |
| **Feature flags**: same journey with the flag ON and OFF | [`booking.flags.spec.ts`](tests/e2e/booking.flags.spec.ts) |
| **GraphQL API**: `errors[]`, `extensions.code`, `path`, permissions, contract (zod) | [`graphql.appointments.spec.ts`](tests/api/graphql.appointments.spec.ts) |
| **REST API**: status codes, error body, permissions | [`rest.pets.spec.ts`](tests/api/rest.pets.spec.ts) |
| Tests create and delete their own data | [`testData.ts`](src/api/testData.ts) |
| Evidence on every failure: screenshot, video, logcat/syslog, page source, build info | [`evidence.ts`](src/helpers/evidence.ts) |
| **GitHub Actions + Expo EAS**: find the build for the PR's commit, emulator + simulator runs | [`mobile-e2e.yml`](.github/workflows/mobile-e2e.yml), [`find-eas-build.ts`](scripts/find-eas-build.ts) |
| BrowserStack real-device matrix | [`wdio.browserstack.conf.ts`](config/wdio.browserstack.conf.ts) |
| iOS accessibility audit (contrast, hit regions, labels) | [`accessibility.spec.ts`](tests/e2e/accessibility.spec.ts) |
| Story → test cases (happy / edge / failure / flag), AIO keys | [`docs/test-design-example.md`](docs/test-design-example.md) |
| Jira bug report with evidence | [`docs/bug-report-example.md`](docs/bug-report-example.md) |

## Run it

```bash
npm ci                       # installs Appium 3 + pinned drivers locally (no global installs)
cp .env.example .env         # app paths, test users, BFF URL

npm run typecheck && npm run lint:selectors
npm run test:api             # GraphQL + REST
npm run smoke:android        # @smoke on a booted emulator (or ANDROID_UDID=<device> for a real phone)
npm run test:ios             # full suite on a simulator (IOS_UDID + IOS_XCODE_ORG_ID for a real iPhone)
npm run test:bs              # device matrix on BrowserStack
npm run build:find -- --platform android --profile preview --commit <sha>   # fetch the EAS build to test
```

| Target | How |
|---|---|
| Android emulator | Any AVD; CI uses API 34 `google_apis` (it has Chrome and is debuggable) |
| iOS simulator | EAS profile with `"ios": { "simulator": true }` → `.app` |
| Real Android | `ANDROID_UDID` from `adb devices` |
| Real iPhone | `IOS_UDID`, `IOS_XCODE_ORG_ID`, `IOS_REAL_DEVICE=true` (push via backend, reset via reinstall) |
| Device cloud | BrowserStack App Automate, 3 devices in parallel |

## Rules that keep it stable

1. **testIDs only, never XPath.** On iOS, a testID becomes `accessibilityIdentifier` (`~id`). On Android it becomes `resource-id`, so the `~` strategy does *not* match there and we use `UiSelector().resourceId()`. That one difference causes a lot of "works on iOS, fails on Android" confusion. See [`selectors.ts`](src/helpers/selectors.ts).
2. **Wait for state, never for time.** No `pause()`. Every wait has a condition and a clear timeout message. CI enforces both rules (`npm run lint:selectors`).
3. **Tests own their data.** Each test creates what it needs through the BFF, with unique names, and deletes it in `after()`.
4. **Always hand control back to `NATIVE_APP`** after a web step (`try/finally`). Otherwise the next spec starts in the wrong context.
5. **No automatic retries.** A test that only passes on retry has a bug in the app or in the test. It gets fixed or quarantined with a ticket.

## Flaky-test playbook (causes I've hit and the fix in this repo)

| Symptom | Real cause | Fix |
|---|---|---|
| Tap "does nothing" on fresh Android 13+ emulators | `POST_NOTIFICATIONS` dialog took the tap; `pm clear` revokes permissions again | `autoGrantPermissions` + re-grant after `mobile: clearApp` ([`app.ts`](src/helpers/app.ts)) |
| Submit button not clickable on small screens | Keyboard covering it | `appium:hideKeyboard` on Android; hide and wait until it's gone on iOS ([`keyboard.ts`](src/helpers/keyboard.ts)) |
| "Element moved" mis-taps | Transitions still animating | `disableWindowAnimation` / `reduceMotion`, plus emulator animations off in CI |
| Login fails only on fresh CI emulators | Chrome first-run screen inside the Custom Tab | Chrome command-line flags in the emulator step ([`mobile-e2e.yml`](.github/workflows/mobile-e2e.yml)) |
| Webview step fails after Chrome auto-updates | Chromedriver no longer matches Chrome | `uiautomator2:chromedriver_autodownload` + cached `chromedriverExecutableDir` |
| iOS login hangs | "Wants to Use … to Sign In" system prompt | Handled explicitly ([`systemDialogs.ts`](src/helpers/systemDialogs.ts)), not hidden by `autoAcceptAlerts` |
| Wrong notification tapped | Leftover notification from an earlier run | Unique title per run ([`push.spec.ts`](tests/e2e/push.spec.ts)) |

## CI flow

```
PR opened ─► static (typecheck, no-sleep/no-XPath guard)
          ├► API tests against staging BFF
          ├► Android: find EAS build for PR head commit → API 34 emulator → @smoke → evidence uploaded
          └► iOS:     find EAS simulator build → iPhone simulator → @smoke → evidence uploaded
Release  ─► workflow_dispatch suite=regression → full suite → JUnit → AIO Tests cycle
```

If no EAS build exists for the PR's commit, the job tests the newest build for that profile and puts a **warning in the job summary**, so a pass against an older build can't be mistaken for a pass on this PR.

## Versions

WebdriverIO **9.x**, Appium **3.9**, UiAutomator2 driver **8.7.x**, XCUITest driver **12.22.x**, TypeScript 5.9, Node 20+.
Drivers are pinned in `package.json` and resolved from the project (local `APPIUM_HOME`), so every machine and CI runner uses the same versions.
UiAutomator2 9.x+ and XCUITest 13.x need Appium 4, which is why they're pinned to these lines.

## Layout

```
config/        wdio.shared / android / ios / browserstack
src/config     env.ts: one place for every environment value
src/screens    page objects
src/flows      sign-in / signed-out state helpers
src/helpers    selectors, app lifecycle, contexts, system dialogs, keyboard, push, evidence
src/api        GraphQL/REST client, test data, feature flags
tests/e2e      mobile specs (AIO case key + @smoke tag in titles)
tests/api      API specs (plain Mocha, no device needed)
scripts/       EAS build finder, selector/wait guard
docs/          test design + bug report examples
```
