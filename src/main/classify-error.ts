import axios from 'axios';
import type { FetchErrorCategory } from '../types.js';

const CERT_ERROR_CODES = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN',
]);

export function classifyError(error: unknown): FetchErrorCategory {
  if (!axios.isAxiosError(error)) return 'unknown';

  const code = error.code ?? '';

  if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return 'game_not_running';
  }

  const nestedCode =
    (error.cause as { code?: string } | undefined)?.code ?? '';

  if (CERT_ERROR_CODES.has(code) || CERT_ERROR_CODES.has(nestedCode)) {
    return 'cert_error';
  }

  return 'unknown';
}
