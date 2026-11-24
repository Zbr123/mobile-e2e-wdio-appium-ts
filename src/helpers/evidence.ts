import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Bug-report evidence, collected automatically on every failed test:
 *   screenshot.png, recording.mp4, logcat.txt (Android) / syslog.txt (iOS),
 *   page-source.xml and build-info.json (which EAS build was under test).
 * Everything lands in artifacts/<test>/ and is uploaded by CI, so a failure can go
 * straight into a Jira ticket without re-running it.
 */
const ARTIFACTS = 'artifacts';
const LOG_LINES = 400;

const safeName = (s: string) => s.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 120);

export async function startRecording(): Promise<void> {
  try {
    await driver.startRecordingScreen({ timeLimit: '600' } as never);
  } catch {
    // Some emulator images can't record; never fail a test because evidence is unavailable.
  }
}

export async function collectEvidence(testName: string, passed: boolean): Promise<void> {
  let video: string | undefined;
  try {
    video = await driver.stopRecordingScreen();
  } catch {
    /* recording was not running */
  }
  if (passed) return;

  const dir = path.join(ARTIFACTS, safeName(testName));
  await mkdir(dir, { recursive: true });

  const tasks: Array<Promise<unknown>> = [
    driver.saveScreenshot(path.join(dir, 'screenshot.png')),
    driver.getPageSource().then((xml) => writeFile(path.join(dir, 'page-source.xml'), xml)),
    copyFile(path.join(ARTIFACTS, 'build-info.json'), path.join(dir, 'build-info.json')),
  ];
  if (video) tasks.push(writeFile(path.join(dir, 'recording.mp4'), Buffer.from(video, 'base64')));

  const logType = driver.isAndroid ? 'logcat' : 'syslog';
  tasks.push(
    driver.getLogs(logType).then((entries) => {
      const lines = (entries as Array<{ timestamp: number; level: string; message: string }>)
        .slice(-LOG_LINES) // the crash/exception is almost always at the tail
        .map((e) => `${new Date(e.timestamp).toISOString()} ${e.level} ${e.message}`);
      return writeFile(path.join(dir, `${logType}.txt`), lines.join('\n'));
    }),
  );

  // allSettled: one missing piece of evidence must not hide the others (or the real failure).
  const results = await Promise.allSettled(tasks);
  results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .forEach((r) => console.warn(`[evidence] ${String(r.reason)}`));
  console.log(`[evidence] saved to ${dir}`);
}
