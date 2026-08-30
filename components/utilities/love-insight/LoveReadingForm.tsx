"use client";

import {
  PRIVACY_MODES,
  PRIVACY_MODE_LABELS,
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STATUS_LABELS,
  type PrivacyMode,
  type RelationshipStatus
} from "@/lib/love-insight/shared";
import { createNameDobReading, createNameReading } from "@/lib/love-insight/api-client";

const INPUT_CLASS =
  "min-w-0 w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

const SELECT_CLASS =
  "min-w-0 w-full rounded-2xl border border-white/15 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 focus:border-cyan-300/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/20";

type LoveReadingFormProps = {
  nameA: string;
  nameB: string;
  dobA: string;
  dobB: string;
  status: RelationshipStatus | "";
  privacy: PrivacyMode;
  submitting: boolean;
  error: string | null;
  onNameAChange: (value: string) => void;
  onNameBChange: (value: string) => void;
  onDobAChange: (value: string) => void;
  onDobBChange: (value: string) => void;
  onStatusChange: (value: RelationshipStatus | "") => void;
  onPrivacyChange: (value: PrivacyMode) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function LoveReadingForm({
  nameA,
  nameB,
  dobA,
  dobB,
  status,
  privacy,
  submitting,
  error,
  onNameAChange,
  onNameBChange,
  onDobAChange,
  onDobBChange,
  onStatusChange,
  onPrivacyChange,
  onSubmit
}: LoveReadingFormProps) {
  return (
    <form className="space-y-4" id="love-reading-form" noValidate onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-200" htmlFor="love-name-a">
          Họ và tên của bạn
        </label>
        <input
          autoComplete="off"
          className={INPUT_CLASS}
          disabled={submitting}
          id="love-name-a"
          maxLength={80}
          minLength={2}
          onChange={(event) => onNameAChange(event.target.value)}
          placeholder="Vd: Nguyễn Văn An"
          required
          type="text"
          value={nameA}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-200" htmlFor="love-name-b">
          Họ và tên người ấy
        </label>
        <input
          autoComplete="off"
          className={INPUT_CLASS}
          disabled={submitting}
          id="love-name-b"
          maxLength={80}
          minLength={2}
          onChange={(event) => onNameBChange(event.target.value)}
          placeholder="Vd: Trần Thị Bình"
          required
          type="text"
          value={nameB}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-200">Ngày sinh</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          Tuỳ chọn — có đủ ngày sinh của cả hai người sẽ cho kết quả chính xác hơn (thần số học, cung
          hoàng đạo, con giáp, ngũ hành).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-300" htmlFor="love-dob-a">
              Ngày sinh của bạn
            </label>
            <input
              className={INPUT_CLASS}
              disabled={submitting}
              id="love-dob-a"
              onChange={(event) => onDobAChange(event.target.value)}
              type="date"
              value={dobA}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-300" htmlFor="love-dob-b">
              Ngày sinh người ấy
            </label>
            <input
              className={INPUT_CLASS}
              disabled={submitting}
              id="love-dob-b"
              onChange={(event) => onDobBChange(event.target.value)}
              type="date"
              value={dobB}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-200" htmlFor="love-status">
          Trạng thái quan hệ <span className="text-zinc-500">(tuỳ chọn)</span>
        </label>
        <select
          className={SELECT_CLASS}
          disabled={submitting}
          id="love-status"
          onChange={(event) => onStatusChange(event.target.value as RelationshipStatus | "")}
          value={status}
        >
          <option value="">— Không muốn nói —</option>
          {RELATIONSHIP_STATUSES.map((item) => (
            <option key={item} value={item}>
              {RELATIONSHIP_STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-200">Chế độ chia sẻ</legend>
        <div className="space-y-2">
          {PRIVACY_MODES.map((mode) => {
            const checked = privacy === mode;
            return (
              <label
                className={`block cursor-pointer rounded-xl border p-3 transition ${
                  checked
                    ? "border-rose-400/50 bg-rose-500/10 ring-1 ring-rose-400/30"
                    : "border-white/10 bg-zinc-900/50 hover:border-white/20"
                }`}
                key={mode}
              >
                <input
                  checked={checked}
                  className="sr-only"
                  name="privacyMode"
                  onChange={() => onPrivacyChange(mode)}
                  type="radio"
                  value={mode}
                />
                <span className="text-sm font-medium text-zinc-100">{PRIVACY_MODE_LABELS[mode]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p aria-live="polite" className="text-sm font-medium text-amber-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export async function submitLoveReading(input: {
  nameA: string;
  nameB: string;
  dobA: string;
  dobB: string;
  status: RelationshipStatus | "";
  privacy: PrivacyMode;
}) {
  const a = input.nameA.trim();
  const b = input.nameB.trim();
  if (a.length < 2 || b.length < 2) {
    return {
      ok: false as const,
      error: { code: "INVALID_INPUT", message: "Vui lòng nhập đầy đủ tên hai người (ít nhất 2 ký tự)." }
    };
  }

  const hasDobA = input.dobA.trim().length > 0;
  const hasDobB = input.dobB.trim().length > 0;
  if (hasDobA !== hasDobB) {
    return {
      ok: false as const,
      error: {
        code: "INVALID_INPUT",
        message:
          "Vui lòng nhập ngày sinh cho cả hai người, hoặc để trống cả hai nếu chỉ muốn bói theo tên."
      }
    };
  }

  const basePayload = {
    relationshipStatus: input.status === "" ? undefined : input.status,
    privacyMode: input.privacy
  };

  if (hasDobA) {
    return createNameDobReading({
      personA: { name: a, dob: input.dobA },
      personB: { name: b, dob: input.dobB },
      ...basePayload
    });
  }

  return createNameReading({
    personA: { name: a },
    personB: { name: b },
    ...basePayload
  });
}
