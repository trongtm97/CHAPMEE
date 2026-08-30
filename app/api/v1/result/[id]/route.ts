import { ok as apiOk } from "@/lib/love-insight/api/envelope";
import {
  getClientIp,
  jsonResponse,
  rateLimit,
  withErrorHandling
} from "@/lib/love-insight/api/helpers";
import { getLoveReadingById, rowToResult } from "@/lib/love-insight/db/loveReadings";

export const runtime = "nodejs";

const ROUTE = "GET:/api/v1/result/[id]";
const RATE_LIMIT = { max: 30, windowMs: 60_000 };

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withErrorHandling(ROUTE, async () => {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, ROUTE, RATE_LIMIT);
    if (!limit.allowed) {
      return jsonResponse(
        {
          ok: false,
          error: {
            code: "RATE_LIMIT",
            message: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
          }
        },
        { status: 429 }
      );
    }

    const { id: rawId } = await ctx.params;
    const id = rawId?.trim();
    if (!id) {
      return jsonResponse(
        { ok: false, error: { code: "INVALID_INPUT", message: "Thiếu reading id." } },
        { status: 400 }
      );
    }

    const row = await getLoveReadingById(id);
    if (!row) {
      return jsonResponse(
        { ok: false, error: { code: "NOT_FOUND", message: "Không tìm thấy kết quả." } },
        { status: 404 }
      );
    }

    const result = rowToResult(row);
    return jsonResponse(
      apiOk({
        id: row.id,
        shareId: row.shareId,
        ...result
      })
    );
  });
}
