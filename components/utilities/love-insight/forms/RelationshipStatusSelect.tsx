"use client";

import {
  RELATIONSHIP_STATUSES,
  RELATIONSHIP_STATUS_LABELS,
  type RelationshipStatus
} from "@/lib/love-insight/shared";

interface RelationshipStatusSelectProps {
  value: RelationshipStatus | "";
  onChange: (value: RelationshipStatus | "") => void;
  label?: string;
  required?: boolean;
  id?: string;
}

export function RelationshipStatusSelect({
  value,
  onChange,
  label = "Trạng thái quan hệ hiện tại (tuỳ chọn)",
  required = false,
  id = "relationshipStatus"
}: RelationshipStatusSelectProps) {
  return (
    <div>
      <label className="label-mystic" htmlFor={id}>
        {label}
      </label>
      <select
        className="select-mystic"
        id={id}
        onChange={(e) => onChange(e.target.value as RelationshipStatus | "")}
        required={required}
        value={value}
      >
        <option value="">— Không muốn nói —</option>
        {RELATIONSHIP_STATUSES.map((s) => (
          <option key={s} value={s}>
            {RELATIONSHIP_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
