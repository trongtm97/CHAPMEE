'use client';

import { useState, type FormEvent } from 'react';
import {
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STATUS_LABELS,
  type RelationshipStatus,
} from '@love-insight/shared';
import { Card } from '@/components/ui/Card';

export function NameDobReadingForm() {
  const [personA, setPersonA] = useState('');
  const [personADob, setPersonADob] = useState('');
  const [personB, setPersonB] = useState('');
  const [personBDob, setPersonBDob] = useState('');
  const [status, setStatus] = useState<RelationshipStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!personA.trim() || !personB.trim() || !personADob || !personBDob) {
      setError('Vui lòng nhập đầy đủ tên và ngày sinh của hai người.');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: gọi ApiClient.createNameDobReading ở prompt tiếp theo
      await new Promise((r) => setTimeout(r, 600));
      alert(
        `Tính năng sẽ kết nối API /api/v1/love/name-dob ở prompt tiếp theo.\nInput: ${personA} (${personADob}) & ${personB} (${personBDob})`,
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              maxLength={50}
            />
          </div>
          <div>
            <label className="label-mystic" htmlFor="personADob">
              Ngày sinh (YYYY-MM-DD)
            </label>
            <input
              id="personADob"
              className="input-mystic"
              type="date"
              value={personADob}
              onChange={(e) => setPersonADob(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              maxLength={50}
            />
          </div>
          <div>
            <label className="label-mystic" htmlFor="personBDob">
              Ngày sinh (YYYY-MM-DD)
            </label>
            <input
              id="personBDob"
              className="input-mystic"
              type="date"
              value={personBDob}
              onChange={(e) => setPersonBDob(e.target.value)}
            />
          </div>
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
