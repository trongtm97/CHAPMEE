'use client';

import { useState, type FormEvent } from 'react';
import {
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STATUS_LABELS,
  type RelationshipStatus,
} from '@love-insight/shared';
import { Card } from '@/components/ui/Card';

export function NameReadingForm() {
  const [personA, setPersonA] = useState('');
  const [personB, setPersonB] = useState('');
  const [status, setStatus] = useState<RelationshipStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!personA.trim() || !personB.trim()) {
      setError('Vui lòng nhập đầy đủ tên hai người.');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: gọi ApiClient.createNameReading ở prompt tiếp theo
      // tạm thời chỉ mock để skeleton chạy
      await new Promise((r) => setTimeout(r, 600));
      alert(
        `Tính năng sẽ kết nối API /api/v1/love/name ở prompt tiếp theo.\nInput: ${personA} & ${personB}`,
      );
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="label-mystic" htmlFor="personA">
            Họ và tên người thứ nhất
          </label>
          <input
            id="personA"
            className="input-mystic"
            type="text"
            value={personA}
            onChange={(e) => setPersonA(e.target.value)}
            placeholder="Vd: Nguyễn Văn An"
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div>
          <label className="label-mystic" htmlFor="personB">
            Họ và tên người thứ hai
          </label>
          <input
            id="personB"
            className="input-mystic"
            type="text"
            value={personB}
            onChange={(e) => setPersonB(e.target.value)}
            placeholder="Vd: Trần Thị Bình"
            autoComplete="off"
            maxLength={50}
          />
        </div>

        <div>
          <label className="label-mystic" htmlFor="status">
            Trạng thái quan hệ hiện tại (tuỳ chọn)
          </label>
          <select
            id="status"
            className="select-mystic"
            value={status}
            onChange={(e) => setStatus(e.target.value as RelationshipStatus | '')}
          >
            <option value="">— Không muốn nói —</option>
            {RELATIONSHIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {RELATIONSHIP_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Đang tính…' : 'Bói ngay'}
        </button>
      </form>
    </Card>
  );
}
