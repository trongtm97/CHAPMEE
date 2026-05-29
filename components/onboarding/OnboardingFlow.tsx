"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { ONBOARDING_GENRES, type OnboardingGoal, type OnboardingRolePreference } from "@/types/onboarding";

type OnboardingFlowProps = {
  initialRole?: OnboardingRolePreference | null;
  initialGenres?: string[];
  initialGoals?: OnboardingGoal[];
  onComplete: (input: {
    rolePreference: OnboardingRolePreference;
    genres: string[];
    goals: OnboardingGoal[];
    skip?: boolean;
  }) => Promise<void>;
};

const roleOptions: { id: OnboardingRolePreference; label: string; description: string }[] = [
  { id: "reader", label: "Đọc truyện", description: "Lướt truyện cuốn, follow tác giả, vote và comment." },
  { id: "author", label: "Viết truyện", description: "Đăng truyện, xây fan và bắt đầu hành trình tác giả." },
  { id: "both", label: "Cả đọc và viết", description: "Vừa đọc vừa sáng tác trên ChapMee." }
];

const readerGoals: { id: OnboardingGoal; label: string }[] = [
  { id: "discover_short_stories", label: "Tìm truyện ngắn cuốn" },
  { id: "swipe_like_tiktok", label: "Lướt truyện như TikTok" },
  { id: "follow_authors", label: "Theo dõi tác giả mới" },
  { id: "comment_vote", label: "Tham gia bình luận/vote" },
  { id: "save_for_later", label: "Lưu truyện đọc sau" }
];

const authorGoals: { id: OnboardingGoal; label: string }[] = [
  { id: "publish_first_story", label: "Đăng truyện đầu tiên" },
  { id: "find_readers", label: "Tìm độc giả" },
  { id: "build_fanbase", label: "Xây fan" },
  { id: "get_feedback", label: "Nhận góp ý" },
  { id: "earn_money_later", label: "Kiếm tiền sau này" }
];

export function OnboardingFlow({ initialGenres = [], initialGoals = [], initialRole = null, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<OnboardingRolePreference | null>(initialRole);
  const [genres, setGenres] = useState<string[]>(initialGenres);
  const [goals, setGoals] = useState<OnboardingGoal[]>(initialGoals);
  const [loading, setLoading] = useState(false);
  const trackedStart = useRef(false);
  const previousRole = useRef<OnboardingRolePreference | null>(null);

  useEffect(() => {
    if (trackedStart.current) return;
    trackedStart.current = true;
    void trackEvent({
      eventName: analyticsEvents.onboardingStarted,
      targetType: "page",
      metadata: { step: 0 }
    });
  }, []);

  useEffect(() => {
    if (role && previousRole.current !== role) {
      previousRole.current = role;
      void trackEvent({
        eventName: analyticsEvents.onboardingRoleSelected,
        targetType: "page",
        metadata: { role, step }
      });
    }
  }, [role, step]);

  useEffect(() => {
    if (step === 1) {
      void trackEvent({
        eventName: analyticsEvents.onboardingGenresSelected,
        targetType: "page",
        metadata: { genres_count: genres.length, step }
      });
    }
  }, [genres.length, step]);

  const goalOptions = useMemo(() => {
    if (role === "author") return authorGoals;
    if (role === "both") return [...readerGoals, ...authorGoals];
    return readerGoals;
  }, [role]);

  const stepsTotal = 4;

  function toggleGenre(genre: string) {
    setGenres((current) => (current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]));
  }

  function toggleGoal(goal: OnboardingGoal) {
    setGoals((current) => (current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]));
  }

  async function handleComplete(skip = false) {
    if (!role) return;
    setLoading(true);
    try {
      if (skip) {
        void trackEvent({
          eventName: analyticsEvents.onboardingSkipped,
          targetType: "page",
          metadata: { role, step }
        });
      } else {
        void trackEvent({
          eventName: analyticsEvents.onboardingCompleted,
          targetType: "page",
          metadata: { role, genres_count: genres.length, goals_count: goals.length, step }
        });
      }
      await onComplete({ genres, goals, rolePreference: role, skip });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: stepsTotal }).map((_, index) => (
          <div className={`h-2 flex-1 rounded-full ${index <= step ? "bg-cyan-300" : "bg-white/10"}`} key={index} />
        ))}
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        {step === 0 ? (
          <div className="space-y-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Bước 1</p>
            <h1 className="text-2xl font-black text-white">Bạn muốn dùng ChapMee để làm gì?</h1>
            <div className="grid gap-3">
              {roleOptions.map((option) => (
                <button className={`rounded-[1.25rem] border p-4 text-left transition ${role === option.id ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/10 bg-white/[0.04]"}`} key={option.id} onClick={() => setRole(option.id)} type="button">
                  <p className="text-base font-black text-white">{option.label}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Bước 2</p>
            <h2 className="text-2xl font-black text-white">Chọn thể loại yêu thích</h2>
            <div className="flex flex-wrap gap-2">
              {ONBOARDING_GENRES.map((genre) => (
                <button className={`rounded-full border px-3 py-2 text-sm font-bold transition ${genres.includes(genre) ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.04] text-zinc-300"}`} key={genre} onClick={() => toggleGenre(genre)} type="button">
                  {genre}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Bước 3</p>
            <h2 className="text-2xl font-black text-white">Mục tiêu của bạn</h2>
            <div className="grid gap-2">
              {goalOptions.map((goal) => (
                <button className={`rounded-[1.15rem] border px-4 py-3 text-left text-sm font-semibold transition ${goals.includes(goal.id) ? "border-cyan-300/40 bg-cyan-300/10 text-white" : "border-white/10 bg-white/[0.04] text-zinc-300"}`} key={goal.id} onClick={() => toggleGoal(goal.id)} type="button">
                  {goal.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-cyan-200">Bước 4</p>
            <h2 className="text-2xl font-black text-white">Sẵn sàng vào ChapMee</h2>
            <p className="text-sm leading-6 text-zinc-400">Bạn có thể sửa lại gu đọc và mục tiêu sau trong Me.</p>
            {role === "reader" || role === "both" ? <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">Gợi ý: sau onboarding, ChapMee sẽ ưu tiên các truyện theo thể loại bạn thích.</p> : null}
            {role === "author" || role === "both" ? <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">Gợi ý: bạn có thể vào Studio để tạo hồ sơ tác giả và đăng truyện đầu tiên.</p> : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={step === 0 || loading} onClick={() => setStep((current) => Math.max(current - 1, 0))} variant="ghost">Back</Button>
          {step < 3 ? (
            <Button className="flex-1" disabled={!role || loading} onClick={() => setStep((current) => Math.min(current + 1, 3))}>Next</Button>
          ) : (
            <Button className="flex-1" loading={loading} onClick={() => void handleComplete(false)}>Hoàn tất</Button>
          )}
        </div>
        <Button className="w-full" disabled={loading} onClick={() => void handleComplete(true)} variant="ghost">Bỏ qua</Button>
      </Card>
    </div>
  );
}
