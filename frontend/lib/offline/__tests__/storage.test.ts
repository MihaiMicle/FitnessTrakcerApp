import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getStorage,
  loadQueue,
  parseQueue,
  QUEUE_KEY,
  readJson,
  removeKey,
  saveQueue,
  writeJson,
} from '../storage';
import { emptyQueue, enqueue, QUEUE_VERSION } from '../queue';

/*
 * The thing every test here really checks: a browser that refuses to store
 * anything, or a half written blob from a previous version, must not take the
 * workout down with it
 */

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getStorage', () => {
  it('returns nothing when rendering on the server', () => {
    vi.stubGlobal('window', undefined);
    expect(getStorage()).toBeNull();
  });

  it('returns nothing when access throws, as in private mode', () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('blocked');
      },
    });
    expect(getStorage()).toBeNull();
  });
});

describe('readJson', () => {
  it('reads back what was written', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    writeJson('k', { reps: 5 });
    expect(readJson('k', null)).toEqual({ reps: 5 });
  });

  it('falls back when the key is missing', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    expect(readJson('missing', 'fallback')).toBe('fallback');
  });

  it('falls back on unparseable content', () => {
    vi.stubGlobal('window', {
      localStorage: memoryStorage({ k: '{not json' }),
    });
    expect(readJson('k', 'fallback')).toBe('fallback');
  });

  it('falls back with no storage at all', () => {
    vi.stubGlobal('window', undefined);
    expect(readJson('k', 'fallback')).toBe('fallback');
  });
});

describe('writeJson', () => {
  it('reports failure when the quota is exhausted', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
    });
    expect(writeJson('k', { a: 1 })).toBe(false);
  });

  it('reports failure with no storage at all', () => {
    vi.stubGlobal('window', undefined);
    expect(writeJson('k', {})).toBe(false);
  });
});

describe('removeKey', () => {
  it('removes the key', () => {
    const storage = memoryStorage({ k: '1' });
    vi.stubGlobal('window', { localStorage: storage });
    removeKey('k');
    expect(storage.data.has('k')).toBe(false);
  });

  it('swallows a storage that throws', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(() => removeKey('k')).not.toThrow();
  });
});

describe('parseQueue', () => {
  it('accepts a queue it wrote itself', () => {
    const q = enqueue(
      emptyQueue(),
      { kind: 'save_session', entityId: 'a', payload: {} },
      0,
    );
    expect(parseQueue(JSON.parse(JSON.stringify(q))).operations).toHaveLength(
      1,
    );
  });

  it('discards a queue from an older version', () => {
    expect(parseQueue({ version: 0, operations: [{}], failed: [] })).toEqual(
      emptyQueue(),
    );
  });

  it('discards junk', () => {
    expect(parseQueue(null)).toEqual(emptyQueue());
    expect(parseQueue('queue')).toEqual(emptyQueue());
  });

  it('drops only the operations that are malformed', () => {
    const good = enqueue(
      emptyQueue(),
      { kind: 'save_session', entityId: 'a', payload: {} },
      0,
    ).operations[0];

    const parsed = parseQueue({
      version: QUEUE_VERSION,
      operations: [good, { id: 'x' }, { ...good, kind: 'launch_rocket' }],
      failed: 'not an array',
    });

    expect(parsed.operations).toHaveLength(1);
    expect(parsed.failed).toEqual([]);
  });
});

describe('loadQueue and saveQueue', () => {
  it('round trips through storage', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    const q = enqueue(
      emptyQueue(),
      { kind: 'save_session', entityId: 'a', payload: { reps: 5 } },
      0,
    );

    expect(saveQueue(q)).toBe(true);
    expect(loadQueue().operations[0].payload).toEqual({ reps: 5 });
  });

  it('starts empty when nothing was stored', () => {
    vi.stubGlobal('window', { localStorage: memoryStorage() });
    expect(loadQueue()).toEqual(emptyQueue());
  });

  it('starts empty when the stored value is corrupt', () => {
    vi.stubGlobal('window', {
      localStorage: memoryStorage({ [QUEUE_KEY]: 'broken' }),
    });
    expect(loadQueue()).toEqual(emptyQueue());
  });
});
