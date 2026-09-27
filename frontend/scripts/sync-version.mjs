/* Copies the package.json version into the iOS project */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* Same formula as versionCode in android/app/build.gradle */
export function buildNumber(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Version must be MAJOR.MINOR.PATCH, got "${version}"`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (minor > 99 || patch > 99) throw new Error(`Minor and patch must be 0 to 99, got "${version}"`);
  return major * 10000 + minor * 100 + patch;
}

export function applyVersion(pbxproj, version) {
  const build = buildNumber(version);
  return pbxproj
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const pbxprojPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');

  if (!existsSync(pbxprojPath)) {
    console.log('No iOS project, nothing to sync');
    return;
  }

  const before = readFileSync(pbxprojPath, 'utf8');
  const after = applyVersion(before, version);
  if (after !== before) writeFileSync(pbxprojPath, after);
  console.log(`iOS version ${version} (${buildNumber(version)})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
