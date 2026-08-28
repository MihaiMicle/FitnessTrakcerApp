import { describe, it, expect, vi, afterEach } from 'vitest';
import { fallbackUuid, isUuid, newSessionId } from '../ids';

/*
 * The id has to be a real UUID because it is written straight into a Postgres
 * uuid column, and it has to exist even where crypto is unavailable, which is
 * any page served over plain http
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isUuid', () => {
  it('accepts a version 4 uuid', () => {
    expect(isUuid('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isUuid('local-12345')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

describe('fallbackUuid', () => {
  it('produces a valid uuid without crypto', () => {
    vi.stubGlobal('crypto', undefined);
    expect(isUuid(fallbackUuid())).toBe(true);
  });

  it('produces distinct values', () => {
    const seen = new Set(Array.from({ length: 50 }, () => fallbackUuid()));
    expect(seen.size).toBe(50);
  });
});

describe('newSessionId', () => {
  it('uses crypto.randomUUID when it is available', () => {
    const randomUUID = vi
      .fn()
      .mockReturnValue('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    vi.stubGlobal('crypto', { randomUUID });

    expect(newSessionId()).toBe('3f2504e0-4f89-41d3-9a0c-0305e82c3301');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('falls back when randomUUID is missing', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(7),
    });
    expect(isUuid(newSessionId())).toBe(true);
  });

  it('falls back when randomUUID throws', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => {
        throw new Error('insecure context');
      },
      getRandomValues: (bytes: Uint8Array) => bytes.fill(7),
    });
    expect(isUuid(newSessionId())).toBe(true);
  });

  it('works with no crypto object at all', () => {
    vi.stubGlobal('crypto', undefined);
    expect(isUuid(newSessionId())).toBe(true);
  });
});
