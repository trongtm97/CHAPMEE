import { ok as apiOk } from "@/lib/love-insight/api/envelope";
import {
  getClientIp,
  jsonResponse,
  rateLimit,
  withErrorHandling
} from "@/lib/love-insight/api/helpers";
import { getPublicShareReading } from "@/lib/love-insight/db/loveReadings";

export const runtime = "nodejs";

const ROUTE = "GET:/api/v1/share/[shareId]";
const RATE_LIMIT = { max: 30, windowMs: 60_000 };

export async function GET(req: Request, ctx: { params: Promise<{ shareId: string }> }) {
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

    const { shareId: rawShareId } = await ctx.params;
    const shareId = rawShareId?.trim();
    if (!shareId) {
      return jsonResponse(
        { ok: false, error: { code: "INVALID_INPUT", message: "Thiếu shareId." } },
        { status: 400 }
      );
    }

    const pub = await getPublicShareReading(shareId);
    if (!pub) {
      return jsonResponse(
        { ok: false, error: { code: "NOT_FOUND", message: "Không tìm thấy kết quả chia sẻ." } },
        { status: 404 }
      );
    }

    return jsonResponse(apiOk(pub));
  });
}
