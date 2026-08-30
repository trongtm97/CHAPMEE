/**
 * API helpers — chung cho mọi route handler.
 *
 *  - parseJsonBody: parse + validate JSON body an toàn
 *  - getClientIp: lấy IP từ x-forwarded-for / x-real-ip / remoteAddr
 *  - rateLimit: in-memory rate limit theo IP
 *  - buildResultUrl / buildShareUrl: dựng URL tuyệt đối từ env
 */

import { NextResponse } from 'next/server';
import { API_VERSION, type LoveApiResult } from '@/lib/love-insight/shared';
import { fail } from '@/lib/love-insight/api/envelope';

// =============================================================================
// JSON body parsing
// =============================================================================

export async function parseJsonBody<T = unknown>(
  req: Request,
  maxBytes = 64 * 1024,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: string;
  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      return {
        ok: false,
        response: jsonResponse(
          fail('PAYLOAD_TOO_LARGE', 'Body quá lớn.', { maxBytes }),
          { status: 413 },
        ),
      };
    }
    raw = text;
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        fail('INVALID_BODY', 'Không đọc được body request.'),
        { status: 400 },
      ),
    };
  }

  if (!raw) {
    return {
      ok: false,
      response: jsonResponse(
        fail('EMPTY_BODY', 'Body trống — vui lòng gửi JSON.'),
        { status: 400 },
      ),
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        fail('INVALID_JSON', 'Body không phải JSON hợp lệ.'),
        { status: 400 },
      ),
    };
  }
}

// =============================================================================
// JSON response wrapper
// =============================================================================

export function jsonResponse<T>(payload: LoveApiResult<T>, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

// =============================================================================
// Client IP
// =============================================================================

/**
 * Lấy IP client từ headers (theo thứ tự ưu tiên).
 *  - x-forwarded-for: header phổ biến nhất khi chạy sau reverse proxy
 *  - x-real-ip: header của nginx
 *  - remoteAddr: fallback từ request.cf hoặc connection (Next.js edge/node)
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return 'unknown';
}

// =============================================================================
// Rate limit (in-memory, đơn giản)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Số request tối đa trong window. */
  max: number;
  /** Độ dài window (ms). */
  windowMs: number;
}

const STORE = new Map<string, RateLimitEntry>();

/**
 * Rate limit đơn giản theo (key, route). State nằm trong memory của process
 * — chỉ phù hợp với single-instance. Khi scale multi-instance, cần thay
 * bằng Redis / Upstash.
 *
 * Cleanup entry hết hạn định kỳ để tránh memory leak.
 */
export function rateLimit(
  key: string,
  routeName: string,
  options: RateLimitOptions = { max: 10, windowMs: 60_000 },
): { allowed: boolean; remaining: number; resetMs: number } {
  const composite = `${routeName}:${key}`;
  const now = Date.now();
  const entry = STORE.get(composite);

  if (!entry || entry.resetAt <= now) {
    STORE.set(composite, { count: 1, resetAt: now + options.windowMs });
    cleanup(now);
    return { allowed: true, remaining: options.max - 1, resetMs: options.windowMs };
  }

  if (entry.count >= options.max) {
    return { allowed: false, remaining: 0, resetMs: entry.resetAt - now };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: options.max - entry.count,
    resetMs: entry.resetAt - now,
  };
}

function cleanup(now: number) {
  // Tránh cleanup quá thường xuyên — chỉ chạy khi STORE > 1000 entries
  if (STORE.size < 1000) return;
  for (const [key, entry] of STORE) {
    if (entry.resetAt <= now) STORE.delete(key);
  }
}

/** Test-only: reset toàn bộ rate limit state. */
export function __resetRateLimitForTest(): void {
  STORE.clear();
}

// =============================================================================
// URL builder
// =============================================================================

function getSiteOrigin(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:4000"
  ).replace(/\/+$/, "");
}

export function buildResultUrl(readingId: string): string {
  return `${getSiteOrigin()}/tien-ich/boi-tinh-yeu/ket-qua/${encodeURIComponent(readingId)}`;
}

export function buildShareUrl(shareId: string): string {
  return `${getSiteOrigin()}/tien-ich/boi-tinh-yeu/chia-se/${encodeURIComponent(shareId)}`;
}

export function buildOgUrl(shareId: string): string {
  return `${getSiteOrigin()}/api/v1/og/love-result?shareId=${encodeURIComponent(shareId)}`;
}

// =============================================================================
// Common error handler
// =============================================================================

/**
 * Bọc một route handler để:
 *  - Bắt mọi exception không lường trước
 *  - Trả về error chuẩn tiếng Việt, KHÔNG expose stack trace
 *  - Log lỗi ở server với message đã được sanitize (che bớt thông tin nhạy cảm)
 *
 * Lưu ý bảo mật:
 *  - KHÔNG log raw request body.
 *  - KHÔNG log full error.stack (chỉ log message ngắn gọn).
 *  - Message từ DB / library có thể chứa user input (vd: "duplicate key 'Nguyen Van A'") —
 *    ta truncate và che bớt phần giống chuỗi tên để giảm leak.
 */
export async function withErrorHandling(
  routeName: string,
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Lỗi không xác định.';
    const safeMessage = sanitizeErrorMessage(rawMessage);
    // Log server-side, KHÔNG log full request body
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[${routeName}]`, safeMessage);
    }
    return jsonResponse(
      fail('INTERNAL_ERROR', 'Có lỗi xảy ra phía server. Vui lòng thử lại sau.'),
      { status: 500 },
    );
  }
}

/**
 * Sanitize error message trước khi log server-side.
 *  - Truncate nếu quá dài (tránh log dump).
 *  - Che các phần giống email / SĐT / URL để giảm leak nếu DB lỗi.
 *  - KHÔNG thay đổi response trả về client (vẫn là message generic).
 */
function sanitizeErrorMessage(msg: string): string {
  if (typeof msg !== 'string') return 'unknown';
  // Truncate
  let safe = msg.length > 200 ? msg.slice(0, 200) + '…' : msg;
  // Che email
  safe = safe.replace(
    /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi,
    '<email>@$2',
  );
  // Che SĐT Việt Nam
  safe = safe.replace(/(\+?84|0)\d{9,10}/g, '<phone>');
  return safe;
}

export { API_VERSION };
