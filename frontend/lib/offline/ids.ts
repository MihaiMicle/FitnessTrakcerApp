/*
 * Client generated session ids
 *
 * Generating the id here is what makes the write path idempotent: the save is
 * a PUT to a known id, so replaying it after a timeout updates the same row
 * instead of creating a second workout. It also means a session exists and can
 * be logged against before any request has succeeded
 *
 * The value has to be a real UUID because the column is `uuid` in Postgres
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  const cryptoObj =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
    return bytes;
  }

  for (let i = 0; i < count; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

/* Version 4 UUID, used when crypto.randomUUID is missing or blocked */
export function fallbackUuid(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function newSessionId(): string {
  const cryptoObj =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoObj?.randomUUID) {
    try {
      return cryptoObj.randomUUID();
    } catch {
      return fallbackUuid();
    }
  }
  return fallbackUuid();
}

export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
