# Bug report example (Jira)

**Summary:** [Android] Tapping an appointment reminder on a killed app opens Home instead of the appointment

| Field | Value |
|---|---|
| Platform / OS | Android 14 (Pixel 8 emulator, API 34). Also on Galaxy S23, Android 13 (BrowserStack) |
| Build | 2.4.0 (187), EAS preview, commit `9f8e7d6`, channel `preview` |
| Not affected | iOS 18.2 (same build): works |
| Severity / impact | High: every reminder tap after the app has been closed lands on the wrong screen |
| Found by | `PC-TC-301` in the release regression run (link to the GitHub Actions run) |

**Steps to reproduce**
1. Sign in as `e2e-owner-01` and create an appointment for any pet.
2. Swipe the app away (force-stop).
3. Send the appointment reminder push for that appointment.
4. Tap the notification.

**Expected:** The app opens on the appointment's detail screen.
**Actual:** The app opens on Home. The appointment is reachable manually. Reproduced 5/5.

**Evidence** (attached from `artifacts/PC-TC-301/`)
- `recording.mp4`: tap at 0:04, Home shown at 0:07
- `screenshot.png`
- `logcat.txt`, relevant lines:
  ```
  W ReactNativeJS: Linking.getInitialURL() returned null
  I ExpoNotifications: Notification response received before JS listener was registered
  ```

**Notes for the developer:** On a cold start, the notification response arrives before the
JS listener is registered, and the deep link from `data.url` isn't read from
`getLastNotificationResponseAsync()`. Warm start (PC-TC-302) passes, which supports this.
