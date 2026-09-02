import { describe, it, expect } from 'vitest';
import { apiErrorMessage, formatDetail } from '../apiError';

/*
  A 422 from FastAPI arrives as an array, a 404 as a string, and a crashed
  handler as neither. All three used to render as "[object Object]" or as an
  empty message, which is what made the toggle-complete failure opaque
 */

describe('formatDetail', () => {
  it('passes an HTTPException string through unchanged', () => {
    expect(formatDetail('User profile not found', 'Not Found')).toBe(
      'User profile not found',
    );
  });

  it('flattens a validation array into a readable line', () => {
    const detail = [
      { type: 'missing', loc: ['query', 'payload'], msg: 'Field required' },
    ];
    expect(formatDetail(detail, 'Unprocessable Content')).toBe(
      'query.payload: Field required',
    );
  });

  it('joins multiple validation issues', () => {
    const detail = [
      { loc: ['body', 'is_completed'], msg: 'Field required' },
      { loc: ['path', 'log_date'], msg: 'Input should be a valid date' },
    ];
    expect(formatDetail(detail, 'Unprocessable Content')).toBe(
      'body.is_completed: Field required; path.log_date: Input should be a valid date',
    );
  });

  it('drops the prefix when an issue has no location', () => {
    expect(formatDetail([{ msg: 'Field required' }], 'fallback')).toBe(
      'Field required',
    );
  });

  it('names the issue when only a location is present', () => {
    expect(formatDetail([{ loc: ['body', 'name'] }], 'fallback')).toBe(
      'body.name: Invalid value',
    );
  });

  it('falls back on an empty array', () => {
    expect(formatDetail([], 'Internal Server Error')).toBe(
      'Internal Server Error',
    );
  });

  it('falls back on an array of nothing usable', () => {
    expect(formatDetail([null, undefined], 'Internal Server Error')).toBe(
      'Internal Server Error',
    );
  });

  it('falls back on an empty string', () => {
    expect(formatDetail('   ', 'Bad Gateway')).toBe('Bad Gateway');
  });

  it('falls back when detail is missing entirely', () => {
    expect(formatDetail(undefined, 'Internal Server Error')).toBe(
      'Internal Server Error',
    );
  });
});

describe('apiErrorMessage', () => {
  it('prefixes the action and includes the status code', () => {
    const detail = [{ loc: ['query', 'payload'], msg: 'Field required' }];
    expect(
      apiErrorMessage('Failed to update day completion', 422, 'Unprocessable Content', detail),
    ).toBe('Failed to update day completion: 422 query.payload: Field required');
  });

  it('uses a generic fallback when statusText is empty', () => {
    expect(apiErrorMessage('Failed to fetch logs', 500, '', undefined)).toBe(
      'Failed to fetch logs: 500 Request failed',
    );
  });
});
