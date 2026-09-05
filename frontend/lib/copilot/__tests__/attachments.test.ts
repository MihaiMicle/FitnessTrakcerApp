/* lib/copilot/__tests__/attachments.test.ts */

import { describe, it, expect, afterEach } from 'vitest';
import {
  MAX_ATTACHMENTS,
  MAX_FILE_BYTES,
  isAcceptedType,
  rejectionMessage,
  stripDataUrl,
  validateFiles,
} from '../attachments';
import {
  clearCopilotListeners,
  emitCopilotChange,
  onCopilotChange,
} from '../events';

function makeFile(name: string, type: string, size = 1024): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('isAcceptedType', () => {
  it('accepts a jpeg', () => {
    expect(isAcceptedType(makeFile('a.jpg', 'image/jpeg'))).toBe(true);
  });

  it('accepts a heic by extension when the browser gives no type', () => {
    /* iOS hands back an empty type string often enough that the filename has
       to be part of the check */
    expect(isAcceptedType(makeFile('IMG_0001.HEIC', ''))).toBe(true);
  });

  it('accepts a pdf', () => {
    /* the copilot extracts text from pdfs, docs and spreadsheets, so these
       are accepted alongside images rather than rejected */
    expect(isAcceptedType(makeFile('plan.pdf', 'application/pdf'))).toBe(true);
  });

  it('rejects an unsupported type', () => {
    expect(isAcceptedType(makeFile('archive.zip', 'application/zip'))).toBe(false);
  });
});

describe('validateFiles', () => {
  it('accepts a normal photo', () => {
    const result = validateFiles([makeFile('a.jpg', 'image/jpeg')]);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it('rejects a file over the size cap with a size reason', () => {
    const result = validateFiles([
      makeFile('big.jpg', 'image/jpeg', MAX_FILE_BYTES + 1),
    ]);
    expect(result.rejected[0].reason).toBe('size');
  });

  it('rejects the wrong type with a type reason', () => {
    const result = validateFiles([makeFile('a.zip', 'application/zip')]);
    expect(result.rejected[0].reason).toBe('type');
  });

  it('stops accepting once the cap is reached', () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      makeFile(`p${i}.jpg`, 'image/jpeg'),
    );
    const result = validateFiles(files);
    expect(result.accepted).toHaveLength(MAX_ATTACHMENTS);
    expect(result.rejected.every((r) => r.reason === 'count')).toBe(true);
  });

  it('counts photos already attached against the cap', () => {
    const result = validateFiles([makeFile('a.jpg', 'image/jpeg')], MAX_ATTACHMENTS);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].reason).toBe('count');
  });

  it('checks type before the count, so the message names the real problem', () => {
    const result = validateFiles([makeFile('a.zip', 'application/zip')], MAX_ATTACHMENTS);
    expect(result.rejected[0].reason).toBe('type');
  });
});

describe('rejectionMessage', () => {
  it('has a distinct message per reason', () => {
    const messages = new Set([
      rejectionMessage('type'),
      rejectionMessage('size'),
      rejectionMessage('count'),
    ]);
    expect(messages.size).toBe(3);
  });
});

describe('stripDataUrl', () => {
  it('removes the data url prefix', () => {
    expect(stripDataUrl('data:image/png;base64,AAAA')).toBe('AAAA');
  });

  it('leaves bare base64 alone', () => {
    expect(stripDataUrl('AAAA')).toBe('AAAA');
  });
});

describe('copilot events', () => {
  afterEach(() => clearCopilotListeners());

  it('calls a subscriber when its topic fires', () => {
    let calls = 0;
    onCopilotChange('nutrition', () => (calls += 1));
    emitCopilotChange('nutrition');
    expect(calls).toBe(1);
  });

  it('does not call subscribers of other topics', () => {
    let calls = 0;
    onCopilotChange('routines', () => (calls += 1));
    emitCopilotChange('nutrition');
    expect(calls).toBe(0);
  });

  it('stops calling after unsubscribe', () => {
    let calls = 0;
    const off = onCopilotChange('nutrition', () => (calls += 1));
    off();
    emitCopilotChange('nutrition');
    expect(calls).toBe(0);
  });

  it('carries on when one listener throws', () => {
    /* A dashboard that unmounted mid-refresh must not stop the workouts page
       from hearing about the same change */
    let reached = false;
    onCopilotChange('nutrition', () => {
      throw new Error('boom');
    });
    onCopilotChange('nutrition', () => (reached = true));
    emitCopilotChange('nutrition');
    expect(reached).toBe(true);
  });

  it('emitting a topic nobody listens to is harmless', () => {
    expect(() => emitCopilotChange('profile')).not.toThrow();
  });
});
