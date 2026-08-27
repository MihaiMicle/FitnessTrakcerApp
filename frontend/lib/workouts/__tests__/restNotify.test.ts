import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  notifyRestComplete,
  playRestChime,
  requestRestNotificationPermission,
  showRestNotification,
  vibrateRestComplete,
} from '../restNotify';

/*
 * The one thing every test here is really checking: a device that cannot do
 * one of these, or a user who denied permission, still gets a working timer
 * rather than an exception thrown mid workout
 */

function fakeAudioContext() {
  const stop = vi.fn();
  const start = vi.fn();
  const gainNode = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
  const oscillator = {
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start,
    stop,
  };

  class Ctx {
    currentTime = 0;
    destination = {};
    createOscillator = () => oscillator;
    createGain = () => gainNode;
  }

  return { Ctx, start, stop };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('vibrateRestComplete', () => {
  it('vibrates when the device supports it', () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    expect(vibrateRestComplete()).toBe(true);
    expect(vibrate).toHaveBeenCalledOnce();
  });

  it('does nothing on a device without vibration', () => {
    vi.stubGlobal('navigator', {});
    expect(vibrateRestComplete()).toBe(false);
  });

  it('swallows a throwing implementation', () => {
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked');
      },
    });
    expect(vibrateRestComplete()).toBe(false);
  });
});

describe('playRestChime', () => {
  it('plays two notes', () => {
    const { Ctx, start, stop } = fakeAudioContext();
    vi.stubGlobal('window', { AudioContext: Ctx });
    expect(playRestChime()).toBe(true);
    expect(start).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('falls back to the prefixed constructor', () => {
    const { Ctx, start } = fakeAudioContext();
    vi.stubGlobal('window', { webkitAudioContext: Ctx });
    expect(playRestChime()).toBe(true);
    expect(start).toHaveBeenCalledTimes(2);
  });

  it('does nothing when there is no audio support', () => {
    vi.stubGlobal('window', {});
    expect(playRestChime()).toBe(false);
  });

  it('swallows a suspended or blocked context', () => {
    vi.stubGlobal('window', {
      AudioContext: class {
        constructor() {
          throw new Error('not allowed');
        }
      },
    });
    expect(playRestChime()).toBe(false);
  });
});

describe('showRestNotification', () => {
  it('posts a notification once permission is granted', () => {
    const created: unknown[] = [];
    class FakeNotification {
      static permission = 'granted';
      constructor(title: string, options: unknown) {
        created.push({ title, options });
      }
    }
    vi.stubGlobal('Notification', FakeNotification);

    expect(showRestNotification('Bench Press · Set 2')).toBe(true);
    expect(created).toHaveLength(1);
  });

  it('stays quiet when permission was denied', () => {
    class FakeNotification {
      static permission = 'denied';
    }
    vi.stubGlobal('Notification', FakeNotification);
    expect(showRestNotification('x')).toBe(false);
  });

  it('swallows a constructor that throws', () => {
    class FakeNotification {
      static permission = 'granted';
      constructor() {
        throw new Error('unsupported');
      }
    }
    vi.stubGlobal('Notification', FakeNotification);
    expect(showRestNotification('x')).toBe(false);
  });
});

describe('requestRestNotificationPermission', () => {
  it('asks only while the answer is still default', () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    class FakeNotification {
      static permission = 'default';
      static requestPermission = requestPermission;
    }
    vi.stubGlobal('Notification', FakeNotification);

    requestRestNotificationPermission();
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it('does not ask again after a decision', () => {
    const requestPermission = vi.fn();
    class FakeNotification {
      static permission = 'denied';
      static requestPermission = requestPermission;
    }
    vi.stubGlobal('Notification', FakeNotification);

    requestRestNotificationPermission();
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('swallows the older throwing form', () => {
    class FakeNotification {
      static permission = 'default';
      static requestPermission = () => {
        throw new Error('callback only');
      };
    }
    vi.stubGlobal('Notification', FakeNotification);
    expect(() => requestRestNotificationPermission()).not.toThrow();
  });
});

describe('notifyRestComplete', () => {
  it('fires every channel that is available', () => {
    const vibrate = vi.fn();
    const { Ctx, start } = fakeAudioContext();
    const created: unknown[] = [];
    class FakeNotification {
      static permission = 'granted';
      constructor(title: string) {
        created.push(title);
      }
    }

    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('window', { AudioContext: Ctx });
    vi.stubGlobal('Notification', FakeNotification);

    notifyRestComplete('Squat · Set 3');

    expect(vibrate).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledTimes(2);
    expect(created).toHaveLength(1);
  });

  it('is silent rather than broken when nothing is available', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', {});
    expect(() => notifyRestComplete('x')).not.toThrow();
  });
});
