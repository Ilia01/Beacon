import { describe, it, expect } from 'vitest';
import { classifyError } from './classify-error.js';
import { AxiosError } from 'axios';

function makeAxiosError(code: string, cause?: { code: string }): AxiosError {
  const error = new AxiosError('request failed', code);
  if (cause) {
    (error as { cause: unknown }).cause = cause;
  }
  return error;
}

describe('classifyError', () => {
  it('returns game_not_running for ECONNREFUSED', () => {
    expect(classifyError(makeAxiosError('ECONNREFUSED'))).toBe(
      'game_not_running',
    );
  });

  it('returns game_not_running for ECONNRESET', () => {
    expect(classifyError(makeAxiosError('ECONNRESET'))).toBe(
      'game_not_running',
    );
  });

  it('returns cert_error for DEPTH_ZERO_SELF_SIGNED_CERT', () => {
    expect(classifyError(makeAxiosError('DEPTH_ZERO_SELF_SIGNED_CERT'))).toBe(
      'cert_error',
    );
  });

  it('returns cert_error for UNABLE_TO_VERIFY_LEAF_SIGNATURE', () => {
    expect(
      classifyError(makeAxiosError('UNABLE_TO_VERIFY_LEAF_SIGNATURE')),
    ).toBe('cert_error');
  });

  it('returns cert_error for CERT_HAS_EXPIRED', () => {
    expect(classifyError(makeAxiosError('CERT_HAS_EXPIRED'))).toBe(
      'cert_error',
    );
  });

  it('returns cert_error when nested cause has cert code', () => {
    expect(
      classifyError(
        makeAxiosError('ERR_BAD_REQUEST', {
          code: 'SELF_SIGNED_CERT_IN_CHAIN',
        }),
      ),
    ).toBe('cert_error');
  });

  it('returns unknown for non-Axios errors', () => {
    expect(classifyError(new Error('something'))).toBe('unknown');
  });

  it('returns unknown for unrecognised Axios error codes', () => {
    expect(classifyError(makeAxiosError('ERR_BAD_RESPONSE'))).toBe('unknown');
  });

  it('returns unknown for null/undefined', () => {
    expect(classifyError(null)).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });
});
