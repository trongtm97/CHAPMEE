"use client";

import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import { BIO_MAX, BIO_MIN_RECOMMENDED, DISPLAY_NAME_MAX } from "@/lib/studio/settings-constants";
import { validateUsername } from "@/lib/profile/buildProfileHandle";
import type { StudioSettingsFormValues } from "@/types/studio-settings";
import type { UserVerificationSummary } from "@/types/verification";

type ProfileCompletionChecklistProps = {
  values: StudioSettingsFormValues;
  verification: UserVerificationSummary;
  publicStoriesCount: number;
};

type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
};

export function ProfileCompletionChecklist({
  publicStoriesCount,
  values,
  verification
}: ProfileCompletionChecklistProps) {
  const usernameValid = Boolean(values.username.trim()) && !validateUsername(values.username.trim()).error;

  const items: CheckItem[] = [
    { done: values.displayName.trim().length >= 2, id: "name", label: "Tên hiển thị đã có" },
    {
      done: values.bio.trim().length >= BIO_MIN_RECOMMENDED,
      id: "bio",
      label: `Giới thiệu đủ tối thiểu ${BIO_MIN_RECOMMENDED} ký tự (${BIO_MAX} tối đa)`
    },
    { done: Boolean(values.avatarUrl.trim()), id: "avatar", label: "Ảnh đại diện đã có" },
    { done: usernameValid, id: "username", label: "Username hợp lệ" },
    {
      actionLabel: "Tạo truyện",
      done: publicStoriesCount > 0,
      href: studioPath("/stories/new"),
      id: "story",
      label: "Có ít nhất 1 truyện công khai"
    },
    {
      actionLabel: "Xác thực",
      done: Boolean(verification.publicBadge),
      href: studioPath("/settings/verification"),
      id: "verify",
      label: "Xác thực tài khoản"
    }
  ];

  const completed = items.filter((item) => item.done).length;
  const progress = Math.round((completed / items.length) * 100);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-white">Hoàn thiện hồ sơ</p>
        <span className="text-sm text-cyan-300">
          {completed}/{items.length}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li className="flex items-start justify-between gap-2 text-sm" key={item.id}>
            <span className={item.done ? "text-emerald-300" : "text-zinc-400"}>
              {item.done ? "✓" : "○"} {item.label}
            </span>
            {!item.done && item.href && item.actionLabel ? (
              <Link className="shrink-0 text-xs font-semibold text-cyan-300" href={item.href}>
                {item.actionLabel}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      {values.displayName.length > DISPLAY_NAME_MAX ? (
        <p className="mt-2 text-xs text-amber-300">Tên hiển thị vượt {DISPLAY_NAME_MAX} ký tự khuyến nghị.</p>
      ) : null}
    </div>
  );
}
