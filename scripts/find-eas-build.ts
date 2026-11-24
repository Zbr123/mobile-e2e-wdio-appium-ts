/**
 * Find the right EAS build to test, download it, and record exactly what was tested.
 *
 *   tsx scripts/find-eas-build.ts --platform android --profile preview --commit <sha>
 *   tsx scripts/find-eas-build.ts --platform ios --profile preview-simulator --simulator --commit <sha>
 *
 * Selection order:
 *   1. finished build for THIS commit and profile  -> tests exactly what the PR changed
 *   2. otherwise the newest finished build for the profile, with a loud warning in the job summary
 *      (a green run against an older build must never look like a pass for this PR)
 *
 * Writes artifacts/build-info.json (attached to every failure report) and exports
 * ANDROID_APP_PATH / IOS_APP_PATH to later GitHub Actions steps.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, createWriteStream, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';

interface EasBuild {
  id: string;
  platform: 'ANDROID' | 'IOS';
  status: string;
  buildProfile?: string;
  appVersion?: string;
  appBuildVersion?: string;
  gitCommitHash?: string;
  channel?: string;
  runtimeVersion?: string;
  createdAt?: string;
  artifacts?: { buildUrl?: string; applicationArchiveUrl?: string };
}

const { values: args } = parseArgs({
  options: {
    platform: { type: 'string' },
    profile: { type: 'string', default: 'preview' },
    commit: { type: 'string' },
    simulator: { type: 'boolean', default: false },
  },
});

const platform = args.platform;
if (platform !== 'android' && platform !== 'ios') {
  throw new Error('--platform must be "android" or "ios"');
}

function listBuilds(commit?: string): EasBuild[] {
  const cmd = process.env.EAS_BIN ?? 'eas';
  const flags = [
    'build:list',
    '--platform', platform!,
    '--build-profile', args.profile!,
    '--status', 'finished',
    '--limit', '5',
    '--json',
    '--non-interactive',
    ...(args.simulator ? ['--simulator'] : []),
    ...(commit ? ['--git-commit-hash', commit] : []),
  ];
  const out = execFileSync(cmd, flags, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  return JSON.parse(out) as EasBuild[];
}

function summary(markdown: string): void {
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
}

async function main(): Promise<void> {
  let exactMatch = true;
  let build = args.commit ? listBuilds(args.commit)[0] : undefined;
  if (!build) {
    exactMatch = false;
    build = listBuilds()[0];
  }
  if (!build?.artifacts?.buildUrl) {
    throw new Error(`No finished ${platform} build with an artifact for profile "${args.profile}"`);
  }

  mkdirSync('apps', { recursive: true });
  mkdirSync('artifacts', { recursive: true });

  const url = build.artifacts.buildUrl;
  let appPath: string;
  if (platform === 'android') {
    if (!url.endsWith('.apk')) {
      throw new Error(`Expected an .apk (set "android.buildType": "apk" in eas.json for "${args.profile}"), got ${url}`);
    }
    appPath = path.resolve('apps/app-under-test.apk');
    await download(url, appPath);
  } else {
    // Simulator builds come as a .tar.gz containing the .app bundle.
    const archive = path.resolve('apps/app-under-test.tar.gz');
    await download(url, archive);
    execFileSync('tar', ['-xzf', archive, '-C', 'apps']);
    const app = readdirSync('apps').find((f) => f.endsWith('.app'));
    if (!app) throw new Error('No .app found in the simulator build archive');
    appPath = path.resolve('apps', app);
  }

  const info = {
    easBuildId: build.id,
    platform,
    profile: build.buildProfile ?? args.profile,
    appVersion: build.appVersion,
    buildNumber: build.appBuildVersion,
    gitCommit: build.gitCommitHash,
    channel: build.channel,
    runtimeVersion: build.runtimeVersion,
    exactCommitMatch: exactMatch,
    url: `https://expo.dev/builds/${build.id}`,
  };
  writeFileSync('artifacts/build-info.json', JSON.stringify(info, null, 2));

  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `${platform === 'android' ? 'ANDROID_APP_PATH' : 'IOS_APP_PATH'}=${appPath}\n`);
  }

  summary(
    [
      `### Build under test (${platform})`,
      exactMatch
        ? `Exact match for commit \`${args.commit}\``
        : `> [!WARNING]\n> No EAS build for commit \`${args.commit ?? '(none given)'}\`. Testing the newest "${args.profile}" build instead.`,
      '',
      '| version | build | commit | channel | EAS |',
      '|---|---|---|---|---|',
      `| ${info.appVersion} | ${info.buildNumber} | \`${info.gitCommit?.slice(0, 7)}\` | ${info.channel ?? '-'} | [${build.id.slice(0, 8)}](${info.url}) |`,
    ].join('\n'),
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
