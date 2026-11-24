import { assertNoGqlErrors, gql } from './http';

/**
 * Feature-flag on/off paths.
 *
 * Assumes the BFF lets a test override a flag for ONE user (a test-only mutation, or the flag
 * provider's per-user targeting). That keeps on/off runs independent and parallel-safe.
 * If flags can only be set per environment, the same specs run against two environments instead;
 * which of the two applies is one of my first questions for the team.
 */
const SET_FLAG = /* GraphQL */ `
  mutation SetFlag($key: String!, $enabled: Boolean) {
    setFeatureFlagOverride(key: $key, enabled: $enabled)
  }`;

export type FlagKey = 'newBookingFlow';

/** `enabled: null` removes the override and returns the user to the default. */
export async function setFlagForUser(token: string, key: FlagKey, enabled: boolean | null): Promise<void> {
  const res = await gql<{ setFeatureFlagOverride: boolean }>(SET_FLAG, { key, enabled }, token);
  assertNoGqlErrors(res, `setFeatureFlagOverride(${key}=${String(enabled)})`);
}
