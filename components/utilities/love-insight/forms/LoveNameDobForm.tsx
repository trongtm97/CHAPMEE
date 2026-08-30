'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  isPrivacyMode,
  type PrivacyMode,
  type RelationshipStatus,
} from '@love-insight/shared';
import { createNameDobReading } from '@love-insight/api-client';
import { Card } from '@/components/ui/Card';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { PrivacyModeSelector } from './PrivacyModeSelector';
import { RelationshipStatusSelect } from './RelationshipStatusSelect';

const LOADING_TEXT = 'Đang phân tích năng lượng tình yêu...';
const BUTTON_TEXT = 'Xem bản phân tích tình yêu';
const NAME_MAX = 80;

/**
 * Form bói theo tên + ngày sinh — dùng cho trang /name-birthday-love.
 * Cả 2 DOB đều bắt buộc (validate ở client + server).
 */
export function LoveNameDobForm() {
  const router = useRouter();
  const [nameA, setNameA] = useState('');
  const [nameADob, setNameADob] = useState('');
  const [nameB, setNameB] = useState('');
  const [nameBDob, setNameBDob] = useState('');
  const [status, setStatus] = useState<RelationshipStatus | ''>('');
  const [privacy, setPrivacy] = useState<PrivacyMode>('INITIALS');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const a = nameA.trim();
    const b = nameB.trim();
    if (a.length < 2 || b.length < 2) {
      setError('Vui lòng nhập đầy đủ tên hai người (ít nhất 2 ký tự).');
      return;
    }
    if (!nameADob || !nameBDob) {
      setError('Vui lòng nhập ngày sinh cho cả hai người.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createNameDobReading({
        personA: { name: a, dob: nameADob },
        personB: { name: b, dob: nameBDob },
        relationshipStatus: status === '' ? undefined : status,
        privacyMode: privacy,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      router.push(`/result/${res.data.readingId}`);
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-mystic" htmlFor="love-dob-a">
              Họ và tên của bạn
            </label>
            <input
              id="love-dob-a"
              className="input-mystic"
              type="text"
              value={nameA}
              onChange={(e) => setNameA(e.target.value)}
              placeholder="Vd: Nguyễn Văn An"
              autoComplete="off"
              maxLength={NAME_MAX}
              disabled={submitting}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label-mystic" htmlFor="love-dob-a-dob">
              Ngày sinh của bạn
            </label>
            <input
              id="love-dob-a-dob"
              className="input-mystic"
              type="date"
              value={nameADob}
              onChange={(e) => setNameADob(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-mystic" htmlFor="love-dob-b">
              Họ và tên người ấy
            </label>
            <input
              id="love-dob-b"
              className="input-mystic"
              type="text"
              value={nameB}
              onChange={(e) => setNameB(e.target.value)}
              placeholder="Vd: Trần Thị Bình"
              autoComplete="off"
              maxLength={NAME_MAX}
              disabled={submitting}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label-mystic" htmlFor="love-dob-b-dob">
              Ngày sinh người ấy
            </label>
            <input
              id="love-dob-b-dob"
              className="input-mystic"
              type="date"
              value={nameBDob}
              onChange={(e) => setNameBDob(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <RelationshipStatusSelect
          value={status}
          onChange={setStatus}
          id="love-dob-status"
        />

        <PrivacyModeSelector value={privacy} onChange={setPrivacy} />

        <ErrorMessage message={error} />

        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText={LOADING_TEXT}
        >
          {BUTTON_TEXT}
        </LoadingButton>
      </form>
    </Card>
  );
}
