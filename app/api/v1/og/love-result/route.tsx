import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import {
  getClientIp,
  rateLimit,
  withErrorHandling
} from "@/lib/love-insight/api/helpers";
import { getPublicShareReading } from "@/lib/love-insight/db/loveReadings";
import { getLoveInsightSiteUrl } from "@/lib/love-insight/site-constants";

export const runtime = "nodejs";

const ROUTE = "GET:/api/v1/og/love-result";
const RATE_LIMIT = { max: 60, windowMs: 60_000 };

export async function GET(req: Request) {
  return withErrorHandling(ROUTE, async () => {
    const ip = getClientIp(req);
    const limit = rateLimit(ip, ROUTE, RATE_LIMIT);
    if (!limit.allowed) {
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    const url = new URL(req.url);
    const shareId = url.searchParams.get("shareId")?.trim();
    if (!shareId) {
      return new NextResponse("Thiếu shareId.", { status: 400 });
    }

    const pub = await getPublicShareReading(shareId);
    if (!pub) {
      return new NextResponse("Không tìm thấy kết quả.", { status: 404 });
    }

    const siteUrl = getLoveInsightSiteUrl();
    const featured = pub.featuredSubscores.slice(0, 3);
    const scoreColor =
      pub.totalScore >= 80
        ? "#34d399"
        : pub.totalScore >= 60
          ? "#fb7299"
          : pub.totalScore >= 40
            ? "#fbbf24"
            : "#fb923c";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            background: "linear-gradient(135deg, #0e0526 0%, #1a0b3d 45%, #2c1a5c 100%)",
            color: "white",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "60px 64px",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -120,
              left: -120,
              width: 480,
              height: 480,
              borderRadius: 9999,
              background:
                "radial-gradient(circle, rgba(167, 139, 250, 0.35) 0%, rgba(167, 139, 250, 0) 70%)",
              display: "flex"
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -160,
              right: -160,
              width: 560,
              height: 560,
              borderRadius: 9999,
              background:
                "radial-gradient(circle, rgba(244, 63, 116, 0.30) 0%, rgba(244, 63, 116, 0) 70%)",
              display: "flex"
            }}
          />

          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#fcd34d",
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 600
            }}
          >
            ✦ Love Match ✦
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: 1.1,
              marginTop: 20,
              maxWidth: 1000
            }}
          >
            {pub.displayPair}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 36,
              gap: 40
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 280,
                height: 220,
                borderRadius: 9999,
                border: `6px solid ${scoreColor}`,
                background: "rgba(255,255,255,0.04)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 130,
                  fontWeight: 800,
                  color: scoreColor,
                  lineHeight: 1
                }}
              >
                {pub.totalScore}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#cdbcec",
                  marginTop: 4
                }}
              >
                / 100
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                flex: 1
              }}
            >
              {featured.map((f) => (
                <div
                  key={f.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 16,
                    padding: "14px 20px"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 24,
                      color: "#f5f0ff",
                      fontWeight: 600
                    }}
                  >
                    <span style={{ display: "flex" }}>{f.label}</span>
                    <span
                      style={{
                        display: "flex",
                        color: "#fcd34d",
                        fontSize: 30,
                        fontWeight: 800
                      }}
                    >
                      {f.score}
                      <span
                        style={{
                          display: "flex",
                          fontSize: 16,
                          color: "#cdbcec",
                          fontWeight: 400,
                          marginLeft: 4
                        }}
                      >
                        /100
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "auto"
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: "#fde68a",
                fontWeight: 600,
                maxWidth: 760
              }}
            >
              {truncate(pub.levelLabel, 60)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                color: "#c4a5f7",
                letterSpacing: 1
              }}
            >
              {siteUrl}
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  });
}

function truncate(text: string, max: number): string {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
