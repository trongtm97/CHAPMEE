import Link from "next/link";
import { Container } from "@/components/utilities/love-insight/layout/Container";
import { LoveInsightShell } from "@/components/utilities/love-insight/LoveInsightShell";
import { Card } from "@/components/utilities/love-insight/ui/Card";
import { Disclaimer } from "@/components/utilities/love-insight/ui/Disclaimer";
import type { PublicShareReading } from "@/lib/love-insight/db/loveReadings";
import { cn } from "@/lib/utils/cn";

const LOVE_CALCULATOR_PATH = "/tien-ich/boi-tinh-yeu";

type LoveShareViewProps = {
  pub: PublicShareReading;
};

export function LoveShareView({ pub }: LoveShareViewProps) {
  return (
    <LoveInsightShell className="-mx-1 rounded-none sm:mx-0 sm:rounded-2xl">
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(244, 63, 116, 0.18), transparent 60%), radial-gradient(ellipse at bottom right, rgba(167, 139, 250, 0.18), transparent 55%)"
          }}
        />
        <Container className="py-12 text-center sm:py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold-300">
            ✦ Kết quả được chia sẻ ✦
          </p>

          <h1
            className={cn(
              "text-display font-bold text-white",
              pub.privacyMode === "HIDDEN"
                ? "text-3xl sm:text-4xl md:text-5xl"
                : "text-4xl sm:text-5xl md:text-6xl"
            )}
          >
            {pub.displayPair}
          </h1>

          <div className="mx-auto mt-10 max-w-md">
            <ScoreCircle level={pub.levelLabel} score={pub.totalScore} />
          </div>

          {pub.summary ? (
            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-lavender-100 sm:text-lg">
              {truncate(pub.summary, 280)}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link className="btn-primary" href={LOVE_CALCULATOR_PATH}>
              ✨ Tạo kết quả của bạn
            </Link>
            <Link className="btn-secondary" href={LOVE_CALCULATOR_PATH}>
              Thử bói tình yêu
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-md text-[11px] uppercase tracking-[0.2em] text-lavender-300/70">
            {pub.privacyMode === "FULL_NAMES"
              ? "Hiển thị tên đầy đủ theo tuỳ chọn riêng tư"
              : pub.privacyMode === "INITIALS"
                ? "Chỉ hiển thị chữ cái đầu"
                : "Đã ẩn tên theo tuỳ chọn riêng tư"}
          </p>
        </Container>
      </section>

      <Container className="pb-10">
        <h2 className="text-display mb-4 text-center text-xl font-bold text-white sm:text-2xl">
          Ba chỉ số nổi bật
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pub.featuredSubscores.map((item) => (
            <FeaturedSubscoreCard item={item} key={item.key} />
          ))}
        </div>
      </Container>

      <Container className="pb-12">
        <Card>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <h2 className="text-display text-xl font-bold text-white sm:text-2xl">
                Bạn cũng muốn biết kết quả của mình?
              </h2>
              <p className="mt-1 text-sm text-lavender-200">
                Chỉ mất vài giây — không cần đăng nhập, không thu thập thông tin cá nhân.
              </p>
            </div>
            <Link className="btn-primary shrink-0" href={LOVE_CALCULATOR_PATH}>
              ✨ Tạo kết quả của bạn
            </Link>
          </div>
        </Card>
      </Container>

      <Container className="pb-12">
        <Disclaimer />
      </Container>
    </LoveInsightShell>
  );
}

function ScoreCircle({ score, level }: { score: number; level: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80
      ? "from-emerald-400 to-emerald-600"
      : clamped >= 60
        ? "from-love-rose-400 to-love-rose-600"
        : clamped >= 40
          ? "from-amber-400 to-amber-600"
          : "from-orange-500 to-love-rose-700";

  return (
    <div className="flex flex-col items-center">
      <div
        aria-label={`Tổng điểm ${clamped} trên 100`}
        className={cn(
          "relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-white/20 bg-gradient-to-br shadow-love-glow sm:h-48 sm:w-48",
          color
        )}
      >
        <div className="absolute inset-2 rounded-full bg-midnight-950/80 backdrop-blur" />
        <div className="relative text-center">
          <p className="text-display text-5xl font-extrabold text-white sm:text-6xl">{clamped}</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-lavender-200/80 sm:text-xs">
            / 100
          </p>
        </div>
      </div>
      <p className="text-display mt-4 text-base font-semibold text-gold-200 sm:mt-5 sm:text-lg">{level}</p>
    </div>
  );
}

function FeaturedSubscoreCard({
  item
}: {
  item: PublicShareReading["featuredSubscores"][number];
}) {
  const clamped = Math.max(0, Math.min(100, item.score));
  const tone =
    clamped >= 70
      ? "border-emerald-400/30 from-emerald-500/10 to-transparent"
      : clamped >= 40
        ? "border-love-rose-400/30 from-love-rose-500/10 to-transparent"
        : "border-amber-400/30 from-amber-500/10 to-transparent";
  const textTone =
    clamped >= 70 ? "text-emerald-200" : clamped >= 40 ? "text-love-rose-200" : "text-amber-200";

  return (
    <div className={cn("rounded-2xl border bg-love-card-glass bg-gradient-to-br p-5 backdrop-blur-md", tone)}>
      <p className="text-sm font-medium text-lavender-200">{item.label}</p>
      <p className={cn("text-display mt-2 text-4xl font-bold sm:text-5xl", textTone)}>
        {clamped}
        <span className="ml-1 text-sm font-normal text-lavender-300">/100</span>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          aria-hidden
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            clamped >= 70
              ? "from-emerald-400 to-emerald-500"
              : clamped >= 40
                ? "from-love-rose-400 to-love-rose-500"
                : "from-amber-400 to-amber-500"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
