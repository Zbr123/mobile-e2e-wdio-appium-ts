import { ensureSignedIn } from '../../src/flows/session';

/**
 * Automated iOS accessibility audit (Xcode 15+ / iOS 17+). Catches low contrast, tap targets that
 * are too small, and elements VoiceOver can't describe. It complements manual VoiceOver/TalkBack
 * passes; it doesn't replace them. Android equivalent: Accessibility Scanner + TalkBack checks.
 */
interface AuditIssue {
  compactDescription: string;
  detailedDescription: string;
  auditType: string;
  element?: string;
}

describe('Accessibility audit (iOS)', () => {
  before(async function () {
    if (!driver.isIOS) this.skip();
    await ensureSignedIn();
  });

  it('PC-TC-501 Home has no contrast, hit-region or missing-label issues', async () => {
    const issues = (await driver.execute('mobile: performAccessibilityAudit', {
      auditTypes: [
        'XCUIAccessibilityAuditTypeContrast',
        'XCUIAccessibilityAuditTypeHitRegion',
        'XCUIAccessibilityAuditTypeSufficientElementDescription',
      ],
    })) as AuditIssue[];

    // Compare descriptions (not the raw objects) so the failure message lists every issue found.
    expect(issues.map((i) => `${i.auditType}: ${i.compactDescription} (${i.element ?? 'unknown element'})`)).toEqual([]);
  });
});
