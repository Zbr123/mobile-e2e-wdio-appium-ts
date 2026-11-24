# From a Jira story to test cases (example)

**Story PC-412:** As a pet owner, when I tap an appointment reminder, I see that appointment.

**Acceptance criteria**
1. Tapping the reminder opens the appointment detail for that appointment.
2. Works whether the app is closed, in the background, or open.
3. A signed-out user is asked to sign in first, then sees the appointment.
4. A cancelled appointment shows a clear message, not an error.

## Cases

| AIO key | Type | Scenario | Expected | Layer | Regression |
|---|---|---|---|---|---|
| PC-TC-301 | Journey | App killed → tap reminder (cold start) | Appointment detail, correct pet | E2E | ✅ smoke |
| PC-TC-302 | Functional | App in background → tap reminder | Appointment detail | E2E | ✅ |
| PC-TC-303 | Functional | App open → reminder arrives | In-app banner; tap opens detail | E2E | ✅ |
| PC-TC-304 | Edge | Signed out → tap reminder | Sign in, then land on the appointment | E2E | ✅ |
| PC-TC-305 | Edge | Appointment cancelled after the push was sent | "This appointment was cancelled" state | E2E | ✅ |
| PC-TC-306 | Failure | Appointment belongs to another user (stale device token) | Not-found state, no data shown | API + E2E | ✅ |
| PC-TC-307 | Failure | Offline when tapped | Cached detail or retry state, no crash | Manual | ⬜ |
| PC-TC-308 | Edge | Notification permission denied (Android 13+ / iOS) | No push; reminder still visible in-app | Manual | ⬜ |
| PC-TC-309 | Failure | Malformed payload (missing URL) | Opens Home, logs a handled error | E2E | ✅ |
| PC-TC-310 | Flag | `newAppointmentDetail` ON vs OFF | Correct detail screen for each | E2E | ✅ |

**Split:** functional cases stay small and fast; one journey case (301) covers the full path end to end.
Manual cases stay manual until they are worth automating (device settings, network conditions).

## Questions for the PO before automating

- AC3: after sign-in, land on the appointment, or on Home? (This changes PC-TC-304's assertion.)
- Do Android and iOS show the same text for a cancelled appointment?
- Does the reminder come from the BFF or from Marketing Cloud? (That decides where the test sends the push from.)
