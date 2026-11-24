#!/usr/bin/env node
/**
 * CI guard for the two rules that keep a mobile suite stable:
 *   1. no fixed sleeps   (pause(), setTimeout-based waits)
 *   2. no XPath          (slow on iOS, breaks on every layout change)
 * Use waitForDisplayed / waitUntil and testIDs instead. A line can opt out with `// guard-ignore: <reason>`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['src', 'tests'];
const RULES = [
  { name: 'fixed sleep', re: /\.pause\(|new Promise\(\s*\(?\s*\w*\s*\)?\s*=>\s*setTimeout/ },
  { name: 'XPath selector', re: /\$\$?\(\s*['"`]\s*(\/\/|\(\/\/|xpath)/i },
];

const files = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });

const problems = [];
for (const file of ROOTS.filter((r) => existsSync(r)).flatMap(files)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('guard-ignore')) return;
      for (const rule of RULES) {
        if (rule.re.test(line)) problems.push(`${file}:${i + 1}  ${rule.name}:  ${line.trim()}`);
      }
    });
}

if (problems.length) {
  console.error(`Selector/wait guard failed (${problems.length}):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('Selector/wait guard passed: no sleeps, no XPath.');
