// Wrapper chuẩn cho API responses (server-side handlers).
import {
  API_VERSION,
  type ApiError,
  type LoveApiResult,
} from '@/lib/love-insight/shared';

export function ok<T>(data: T): LoveApiResult<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string, details?: unknown): LoveApiResult<never> {
  const error: ApiError = { code, message, details };
  return { ok: false, error };
}

export { API_VERSION };
