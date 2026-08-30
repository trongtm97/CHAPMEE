/**
 * API client dùng chung cho web & mobile.
 *
 * - Web: truyền baseUrl = '' (relative URL — cùng domain với Next.js).
 * - Mobile: truyền baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL (vd. http://10.0.2.2:3000).
 *
 * KHÔNG tính điểm ở client. Mọi logic scoring đều chạy trên backend.
 */

import {
  API_PATHS,
  DEFAULT_TIMEOUT_MS,
  ERROR_CODES,
  isApiErrorLike,
  validateLoveNameDobRequest,
  validateLoveNameRequest,
  type ApiError,
  type ApiResponse,
  type LoveApiResult,
  type LoveNameDobRequest,
  type LoveNameRequest,
  type LoveReadingResult,
  type PublicShareReading,
} from '@/lib/love-insight/shared';

export interface RequestOptions {
  /** Base URL, không có trailing slash. Để trống = dùng relative URL (cùng domain). */
  baseUrl?: string;
  /** Timeout cho mỗi request, mặc định 15s. */
  timeoutMs?: number;
  /** Hàm fetch tuỳ biến (cho SSR / test). Mặc định dùng global fetch. */
  fetcher?: typeof fetch;
  /** Headers bổ sung (vd. analytics, app version, ...). */
  headers?: Record<string, string>;
  /** AbortSignal bên ngoài (vd. cancel khi component unmount). */
  signal?: AbortSignal;
}

type Method = 'GET' | 'POST';

// =============================================================================
// Public API
// =============================================================================

export async function createNameReading(
  payload: LoveNameRequest,
  options: RequestOptions = {},
): Promise<LoveApiResult<ApiResponse>> {
  const check = validateLoveNameRequest(payload);
  if (!check.ok) return { ok: false, error: check.error };

  return request<ApiResponse>(
    'POST',
    API_PATHS.loveName,
    payload,
    options,
  );
}

export async function createNameDobReading(
  payload: LoveNameDobRequest,
  options: RequestOptions = {},
): Promise<LoveApiResult<ApiResponse>> {
  const check = validateLoveNameDobRequest(payload);
  if (!check.ok) return { ok: false, error: check.error };

  return request<ApiResponse>(
    'POST',
    API_PATHS.loveNameDob,
    payload,
    options,
  );
}

export async function getResult(
  id: string,
  options: RequestOptions = {},
): Promise<LoveApiResult<LoveReadingResult>> {
  if (!id || typeof id !== 'string') {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Thiếu reading id.' },
    };
  }
  return request<LoveReadingResult>('GET', API_PATHS.result(id), undefined, options);
}

export async function getShareResult(
  shareId: string,
  options: RequestOptions = {},
): Promise<LoveApiResult<PublicShareReading>> {
  if (!shareId || typeof shareId !== 'string') {
    return {
      ok: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Thiếu shareId.' },
    };
  }
  return request<PublicShareReading>('GET', API_PATHS.share(shareId), undefined, options);
}

// =============================================================================
// Internals
// =============================================================================

function buildUrl(baseUrl: string, path: string): string {
  const base = (baseUrl ?? '').replace(/\/+$/, '');
  return `${base}${path}`;
}

async function request<T>(
  method: Method,
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<LoveApiResult<T>> {
  const url = buildUrl(options.baseUrl ?? '', path);
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const externalSignal = options.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    };

    const res = await fetcher(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const raw = await parseJsonSafe(res);

    // Server luôn trả về envelope `LoveApiResult<T> = { ok, data } | { ok, error }`
    // (xem `jsonResponse` ở apps/web). Cả 2 nhánh HTTP status đều có envelope.
    // Client PHẢI unwrap `.data` / `.error` để call site đọc đúng field —
    // nếu trả nguyên `raw` làm `data`, form sẽ đọc `res.data.readingId` ra
    // `undefined` và navigate tới `/result/undefined` (bug thực tế đã xảy ra).
    if (raw && typeof raw === 'object' && 'ok' in raw) {
      const env = raw as { ok: boolean; data?: unknown; error?: unknown };
      if (env.ok && 'data' in env) {
        return { ok: true, data: env.data as T };
      }
      if (!env.ok && isApiErrorLike(env.error)) {
        return { ok: false, error: env.error };
      }
    }

    // Fallback: HTTP status != 2xx nhưng server không trả envelope đúng shape
    // (vd. proxy trả HTML 502). Vẫn cố gắng tách ApiError nếu có, không thì
    // build error từ HTTP status.
    if (!res.ok) {
      const err =
        raw && isApiErrorLike(raw) ? raw : buildHttpError(res.status, res.statusText);
      return { ok: false, error: err };
    }

    // HTTP OK nhưng body không phải envelope hợp lệ → coi như parse error.
    if (raw === null) {
      return {
        ok: false,
        error: {
          code: ERROR_CODES.PARSE_ERROR,
          message: 'Phản hồi không hợp lệ từ server.',
        },
      };
    }

    return {
      ok: false,
      error: {
        code: ERROR_CODES.PARSE_ERROR,
        message: 'Server trả về response không đúng định dạng envelope.',
      },
    };
  } catch (err) {
    return { ok: false, error: toNetworkError(err) };
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function buildHttpError(status: number, statusText: string): ApiError {
  if (status === 404) {
    return {
      code: ERROR_CODES.HTTP_NOT_FOUND,
      message: 'Không tìm thấy kết quả.',
    };
  }
  if (status >= 500) {
    return {
      code: ERROR_CODES.HTTP_SERVER_ERROR,
      message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    };
  }
  return {
    code: `HTTP_${status}` as const,
    message: statusText || `Yêu cầu thất bại (HTTP ${status}).`,
  };
}

function toNetworkError(err: unknown): ApiError {
  const isAbort = (err as { name?: string } | null)?.name === 'AbortError';
  if (isAbort) {
    return {
      code: ERROR_CODES.TIMEOUT,
      message: 'Quá thời gian chờ phản hồi.',
    };
  }
  return {
    code: ERROR_CODES.NETWORK_ERROR,
    message: 'Không thể kết nối tới máy chủ.',
  };
}
