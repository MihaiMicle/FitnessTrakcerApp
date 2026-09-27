import { describe, expect, it } from 'vitest';
import { applyVersion, buildNumber } from '../sync-version.mjs';

describe('buildNumber', () => {
  it('packs major, minor and patch into one increasing integer', () => {
    expect(buildNumber('1.0.0')).toBe(10000);
    expect(buildNumber('1.1.0')).toBe(10100);
    expect(buildNumber('2.3.14')).toBe(20314);
  });

  it('orders the same way semver does', () => {
    expect(buildNumber('1.9.99')).toBeLessThan(buildNumber('1.10.0'));
    expect(buildNumber('1.99.99')).toBeLessThan(buildNumber('2.0.0'));
  });

  it('rejects anything that is not plain MAJOR.MINOR.PATCH', () => {
    expect(() => buildNumber('1.1')).toThrow();
    expect(() => buildNumber('1.1.0-beta.1')).toThrow();
    expect(() => buildNumber('v1.1.0')).toThrow();
  });

  it('rejects a minor or patch that would collide with the next digit', () => {
    expect(() => buildNumber('1.100.0')).toThrow();
    expect(() => buildNumber('1.0.100')).toThrow();
  });
});

describe('applyVersion', () => {
  const pbxproj = [
    '\t\t\t\tCURRENT_PROJECT_VERSION = 1;',
    '\t\t\t\tMARKETING_VERSION = 1.0;',
    '\t\t\t\tCURRENT_PROJECT_VERSION = 1;',
    '\t\t\t\tMARKETING_VERSION = 1.0;',
  ].join('\n');

  it('rewrites every build configuration', () => {
    const out = applyVersion(pbxproj, '1.1.0');
    expect(out.match(/MARKETING_VERSION = 1\.1\.0;/g)).toHaveLength(2);
    expect(out.match(/CURRENT_PROJECT_VERSION = 10100;/g)).toHaveLength(2);
  });

  it('is a no-op when the version already matches', () => {
    const once = applyVersion(pbxproj, '1.1.0');
    expect(applyVersion(once, '1.1.0')).toBe(once);
  });
});
