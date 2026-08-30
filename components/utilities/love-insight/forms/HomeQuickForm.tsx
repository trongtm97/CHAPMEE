"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/utilities/love-insight/ui/Card";
import { ErrorMessage } from "@/components/utilities/love-insight/ui/ErrorMessage";
import { LoadingButton } from "@/components/utilities/love-insight/ui/LoadingButton";
import { LoveReadingProgressOverlay } from "@/components/utilities/love-insight/ui/LoveReadingProgressOverlay";
import { createNameDobReading, createNameReading } from "@/lib/love-insight/api-client";
import type { PrivacyMode, RelationshipStatus } from "@/lib/love-insight/shared";
import { PrivacyModeSelector } from "./PrivacyModeSelector";
import { RelationshipStatusSelect } from "./RelationshipStatusSelect";

const LOADING_TEXT = "Đang phân tích năng lượng tình yêu...";
const BUTTON_TEXT = "Xem tình yêu của hai bạn";
const NAME_MAX = 80;

/**
 * Form kép — tự chọn endpoint:
 *  - Không nhập DOB → POST /api/v1/love/name
 *  - Nhập đủ 2 DOB → POST /api/v1/love/name-dob
 */
export function HomeQuickForm() {
  const router = useRouter();
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [dobA, setDobA] = useState("");
  const [dobB, setDobB] = useState("");
  const [status, setStatus] = useState<RelationshipStatus | "">("");
  const [privacy, setPrivacy] = useState<PrivacyMode>("INITIALS");
  const [submitting, setSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiDoneRef = useRef(false);
  const progressDoneRef = useRef(false);
  const targetRouteRef = useRef<string | null>(null);

  const maybeNavigate = useCallback(() => {
    if (apiDoneRef.current && progressDoneRef.current && targetRouteRef.current) {
      router.push(targetRouteRef.current);
    }
  }, [router]);

  const handleProgressComplete = useCallback(() => {
    progressDoneRef.current = true;
    maybeNavigate();
  }, [maybeNavigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const a = nameA.trim();
    const b = nameB.trim();
    if (a.length < 2 || b.length < 2) {
      setError("Vui lòng nhập đầy đủ tên hai người (ít nhất 2 ký tự).");
      return;
    }

    const hasDobA = dobA.trim().length > 0;
    const hasDobB = dobB.trim().length > 0;

    if (hasDobA !== hasDobB) {
      setError(
        "Vui lòng nhập ngày sinh cho cả hai người, hoặc để trống cả hai nếu chỉ muốn bói theo tên."
      );
      return;
    }

    apiDoneRef.current = false;
    progressDoneRef.current = false;
    targetRouteRef.current = null;
    setSubmitting(true);
    setShowProgress(true);

    try {
      const basePayload = {
        relationshipStatus: status === "" ? undefined : status,
        privacyMode: privacy
      };
      const res = hasDobA
        ? await createNameDobReading({
            personA: { name: a, dob: dobA },
            personB: { name: b, dob: dobB },
            ...basePayload
          })
        : await createNameReading({
            personA: { name: a },
            personB: { name: b },
            ...basePayload
          });
      if (!res.ok) {
        setShowProgress(false);
        setError(res.error.message);
        return;
      }
      targetRouteRef.current = `/tien-ich/boi-tinh-yeu/ket-qua/${res.data.readingId}`;
      apiDoneRef.current = true;
      maybeNavigate();
    } catch {
      setShowProgress(false);
      setError("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <LoveReadingProgressOverlay active={showProgress} onComplete={handleProgressComplete} />
      <Card>
        <form className="space-y-5" noValidate onSubmit={onSubmit}>
          <div>
            <label className="label-mystic" htmlFor="home-name-a">
              Họ và tên của bạn
            </label>
            <input
              autoComplete="off"
              className="input-mystic"
              disabled={submitting}
              id="home-name-a"
              maxLength={NAME_MAX}
              minLength={2}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="Vd: Nguyễn Văn An"
              required
              type="text"
              value={nameA}
            />
          </div>

          <div>
            <label className="label-mystic" htmlFor="home-name-b">
              Họ và tên người ấy
            </label>
            <input
              autoComplete="off"
              className="input-mystic"
              disabled={submitting}
              id="home-name-b"
              maxLength={NAME_MAX}
              minLength={2}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Vd: Trần Thị Bình"
              required
              type="text"
              value={nameB}
            />
          </div>

          <div>
            <p className="label-mystic mb-3">Ngày sinh</p>
            <p className="mb-3 text-xs leading-relaxed text-lavender-400/80">
              Tuỳ chọn — có đủ ngày sinh của cả hai người sẽ cho kết quả chính xác hơn.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-lavender-300" htmlFor="home-dob-a">
                  Ngày sinh của bạn
                </label>
                <input
                  className="input-mystic"
                  disabled={submitting}
                  id="home-dob-a"
                  onChange={(e) => setDobA(e.target.value)}
                  type="date"
                  value={dobA}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-lavender-300" htmlFor="home-dob-b">
                  Ngày sinh người ấy
                </label>
                <input
                  className="input-mystic"
                  disabled={submitting}
                  id="home-dob-b"
                  onChange={(e) => setDobB(e.target.value)}
                  type="date"
                  value={dobB}
                />
              </div>
            </div>
          </div>

          <RelationshipStatusSelect id="home-status" onChange={setStatus} value={status} />

          <PrivacyModeSelector onChange={setPrivacy} value={privacy} />

          <ErrorMessage message={error} />

          <LoadingButton loading={submitting} loadingText={LOADING_TEXT} type="submit">
            {BUTTON_TEXT}
          </LoadingButton>
        </form>
      </Card>
    </>
  );
}
