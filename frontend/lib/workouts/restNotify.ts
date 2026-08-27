/*
 * How the app tells you rest is over
 *
 * A phone locked in a pocket mid workout will not see a toast, so this fires
 * three independent channels: vibration, a short chime, and a system
 * notification. Each is optional and each failure is swallowed, because a
 * blocked notification permission or a suspended audio context must never take
 * the workout down with it
 */

const CHIME_FREQUENCIES = [880, 1320];
const CHIME_NOTE_SECONDS = 0.16;

type AudioContextCtor = new () => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext || w.webkitAudioContext || null;
}

/* Short two note chime, synthesised so the app ships no audio asset */
export function playRestChime(): boolean {
  const Ctor = audioContextCtor();
  if (!Ctor) return false;

  try {
    const ctx = new Ctor();
    CHIME_FREQUENCIES.forEach((frequency, i) => {
      const start = ctx.currentTime + i * CHIME_NOTE_SECONDS;
      const end = start + CHIME_NOTE_SECONDS;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;

      /* Ramp down instead of cutting, a hard stop clicks */
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end);
    });
    return true;
  } catch {
    return false;
  }
}

export function vibrateRestComplete(): boolean {
  if (typeof navigator === 'undefined') return false;
  const vibrate = (navigator as Navigator & { vibrate?: unknown }).vibrate;
  if (typeof vibrate !== 'function') return false;
  try {
    vibrate.call(navigator, [120, 60, 120]);
    return true;
  } catch {
    return false;
  }
}

/*
 * Ask once, at the moment the user starts their first rest
 *
 * Asking on page load gets denied out of habit, asking when a timer is already
 * running gives the prompt an obvious reason to exist
 */
export function requestRestNotificationPermission(): void {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'default') return;
  try {
    void Notification.requestPermission();
  } catch {
    /* Older Safari throws on the promise form, nothing to recover */
  }
}

export function showRestNotification(label: string): boolean {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    new Notification('Rest complete', {
      body: label,
      tag: 'workout-rest',
      silent: false,
    });
    return true;
  } catch {
    return false;
  }
}

/* Fire every channel, ignoring the ones this device or user has turned off */
export function notifyRestComplete(label: string): void {
  vibrateRestComplete();
  playRestChime();
  showRestNotification(label);
}
