"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  approveVerificationAction,
  grantVerificationAction,
  rejectVerificationAction
} from "@/lib/admin/grant-verification";
import { revokeVerificationAction } from "@/lib/admin/revoke-verification";
import { requestVerificationMoreInfoAction } from "@/lib/admin/update-verification-status";
import { searchAdminUsers, type AdminUserSearchResult } from "@/lib/admin/get-users";
import { checkUsernameVerificationRisk } from "@/lib/admin/check-username-verification-risk";
import {
  ADMIN_VERIFICATION_TYPES,
  VERIFICATION_TYPE_LABELS,
  type VerificationType
} from "@/types/verification";
import {
  REJECT_REASON_OPTIONS,
  REVOKE_REASON_OPTIONS,
  type VerificationActionType
} from "@/types/admin-verification";
import type { AdminVerificationListItem } from "@/types/verification";

type Props = {
  action: VerificationActionType | null;
  item: AdminVerificationListItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function VerificationActionModals({ action, item, onClose, onSuccess }: Props) {
  if (!action) return null;

  if (action === "grant_manual") {
    return <GrantManualModal onClose={onClose} onSuccess={onSuccess} />;
  }

  if (!item) return null;

  if (action === "approve") {
    return (
      <ApproveModal item={item} onClose={onClose} onSuccess={onSuccess} />
    );
  }
  if (action === "reject") {
    return <RejectModal item={item} onClose={onClose} onSuccess={onSuccess} />;
  }
  if (action === "needs_more_info") {
    return (
      <NeedsMoreInfoModal item={item} onClose={onClose} onSuccess={onSuccess} />
    );
  }
  if (action === "revoke") {
    return <RevokeModal item={item} onClose={onClose} onSuccess={onSuccess} />;
  }

  return null;
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-white";

function ModalShell({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ApproveModal({
  item,
  onClose,
  onSuccess
}: {
  item: AdminVerificationListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [verificationType, setVerificationType] = useState<VerificationType>(item.verificationType);
  const [publicLabel, setPublicLabel] = useState(item.publicLabel ?? "");
  const [publicBadgeEnabled, setPublicBadgeEnabled] = useState(item.publicBadgeEnabled);
  const [publicNote, setPublicNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!confirmed) {
      setMessage("Vui lòng xác nhận trước khi duyệt.");
      return;
    }
    startTransition(async () => {
      const result = await approveVerificationAction({
        requestId: item.id,
        verificationType,
        publicLabel: publicLabel || null,
        publicNote: publicNote || null,
        adminNote: adminNote || null,
        publicBadgeEnabled
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Duyệt xác thực">
      <div className="space-y-3 text-sm">
        <Field label="Loại xác thực">
          <select
            className={inputClass}
            onChange={(e) => setVerificationType(e.target.value as VerificationType)}
            value={verificationType}
          >
            {ADMIN_VERIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {VERIFICATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nhãn công khai">
          <input className={inputClass} onChange={(e) => setPublicLabel(e.target.value)} value={publicLabel} />
        </Field>
        <Checkbox
          checked={publicBadgeEnabled}
          label="Hiển thị badge công khai"
          onChange={setPublicBadgeEnabled}
        />
        <Field label="Ghi chú gửi user">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setPublicNote(e.target.value)} value={publicNote} />
        </Field>
        <Field label="Ghi chú nội bộ">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setAdminNote(e.target.value)} value={adminNote} />
        </Field>
        <Checkbox
          checked={confirmed}
          label="Tôi hiểu thao tác này sẽ hiển thị badge xác thực trên tài khoản nếu bật công khai."
          onChange={setConfirmed}
        />
        {message ? <p className="text-red-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Duyệt xác thực
        </Button>
      </div>
    </ModalShell>
  );
}

function RejectModal({
  item,
  onClose,
  onSuccess
}: {
  item: AdminVerificationListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reasonCode, setReasonCode] = useState<string>(REJECT_REASON_OPTIONS[0].value);
  const [customReason, setCustomReason] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reasonLabel =
    REJECT_REASON_OPTIONS.find((r) => r.value === reasonCode)?.label ?? customReason;

  function submit() {
    const reason = reasonCode === "other" ? customReason.trim() : reasonLabel;
    if (!reason) {
      setMessage("Vui lòng nhập lý do từ chối.");
      return;
    }
    startTransition(async () => {
      const result = await rejectVerificationAction({
        requestId: item.id,
        reason,
        reasonCode,
        publicNote: publicNote || reason,
        adminNote: adminNote || null
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Từ chối xác thực">
      <div className="space-y-3 text-sm">
        <Field label="Lý do từ chối">
          <select className={inputClass} onChange={(e) => setReasonCode(e.target.value)} value={reasonCode}>
            {REJECT_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        {reasonCode === "other" ? (
          <Field label="Lý do khác">
            <input className={inputClass} onChange={(e) => setCustomReason(e.target.value)} value={customReason} />
          </Field>
        ) : null}
        <Field label="Ghi chú gửi user">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setPublicNote(e.target.value)} value={publicNote} />
        </Field>
        <Field label="Ghi chú nội bộ">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setAdminNote(e.target.value)} value={adminNote} />
        </Field>
        {message ? <p className="text-red-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button" variant="ghost">
          Từ chối
        </Button>
      </div>
    </ModalShell>
  );
}

function NeedsMoreInfoModal({
  item,
  onClose,
  onSuccess
}: {
  item: AdminVerificationListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [message, setMessage] = useState("");
  const [deadline, setDeadline] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await requestVerificationMoreInfoAction({
        requestId: item.id,
        message,
        deadline: deadline || null,
        adminNote: adminNote || null
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Yêu cầu bổ sung">
      <div className="space-y-3 text-sm">
        <Field label="Nội dung cần bổ sung">
          <textarea className={`${inputClass} min-h-20`} onChange={(e) => setMessage(e.target.value)} value={message} />
        </Field>
        <Field label="Hạn bổ sung (tuỳ chọn)">
          <input className={inputClass} onChange={(e) => setDeadline(e.target.value)} type="date" value={deadline} />
        </Field>
        <Field label="Ghi chú nội bộ">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setAdminNote(e.target.value)} value={adminNote} />
        </Field>
        {error ? <p className="text-red-300">{error}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Gửi yêu cầu bổ sung
        </Button>
      </div>
    </ModalShell>
  );
}

function RevokeModal({
  item,
  onClose,
  onSuccess
}: {
  item: AdminVerificationListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reasonCode, setReasonCode] = useState<string>(REVOKE_REASON_OPTIONS[0].value);
  const [customReason, setCustomReason] = useState("");
  const [revokePublicBadge, setRevokePublicBadge] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reasonLabel =
    REVOKE_REASON_OPTIONS.find((r) => r.value === reasonCode)?.label ?? customReason;

  function submit() {
    const reason = reasonCode === "other" ? customReason.trim() : reasonLabel;
    if (!reason) {
      setMessage("Vui lòng nhập lý do thu hồi.");
      return;
    }
    startTransition(async () => {
      const result = await revokeVerificationAction({
        requestId: item.id,
        revokeReason: reason,
        reasonCode,
        revokePublicBadge,
        adminNote: adminNote || null
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Thu hồi xác thực">
      <div className="space-y-3 text-sm">
        <Field label="Lý do thu hồi">
          <select className={inputClass} onChange={(e) => setReasonCode(e.target.value)} value={reasonCode}>
            {REVOKE_REASON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        {reasonCode === "other" ? (
          <Field label="Lý do khác">
            <input className={inputClass} onChange={(e) => setCustomReason(e.target.value)} value={customReason} />
          </Field>
        ) : null}
        <Checkbox
          checked={revokePublicBadge}
          label="Thu hồi badge công khai"
          onChange={setRevokePublicBadge}
        />
        <Field label="Ghi chú nội bộ">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setAdminNote(e.target.value)} value={adminNote} />
        </Field>
        {message ? <p className="text-red-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button" variant="ghost">
          Thu hồi xác thực
        </Button>
      </div>
    </ModalShell>
  );
}

function GrantManualModal({
  onClose,
  onSuccess
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null);
  const [verificationType, setVerificationType] = useState<VerificationType>("blue_tick");
  const [publicLabel, setPublicLabel] = useState("");
  const [publicBadgeEnabled, setPublicBadgeEnabled] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [publicNote, setPublicNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [usernameWarning, setUsernameWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selected?.username) {
      setUsernameWarning(null);
      return;
    }
    startTransition(async () => {
      const risk = await checkUsernameVerificationRisk(selected.username);
      setUsernameWarning(risk.warning);
    });
  }, [selected?.username]);

  function search() {
    startTransition(async () => {
      const result = await searchAdminUsers({ query, page: 1, pageSize: 8 });
      setResults(result.users);
    });
  }

  function submit() {
    if (!selected) {
      setMessage("Chọn tài khoản trước.");
      return;
    }
    if (!adminNote.trim()) {
      setMessage("Lý do nội bộ là bắt buộc.");
      return;
    }
    if (!confirmed) {
      setMessage("Vui lòng xác nhận trước khi cấp.");
      return;
    }
    startTransition(async () => {
      const result = await grantVerificationAction({
        userId: selected.id,
        verificationType,
        publicLabel: publicLabel || null,
        publicNote: publicNote || null,
        adminNote,
        publicBadgeEnabled
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      onSuccess();
      onClose();
    });
  }

  return (
    <ModalShell onClose={onClose} title="Cấp xác thực thủ công">
      <div className="space-y-3 text-sm">
        <div className="flex gap-2">
          <input
            className={`${inputClass} flex-1`}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm user..."
            value={query}
          />
          <Button disabled={isPending} onClick={search} type="button">
            Tìm
          </Button>
        </div>
        {results.length > 0 ? (
          <ul className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  className={`w-full rounded-lg px-3 py-2 text-left ${
                    selected?.id === user.id
                      ? "bg-cyan-300/15 text-cyan-100"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                  onClick={() => setSelected(user)}
                  type="button"
                >
                  {user.display_name ?? user.username} (@{user.username})
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {usernameWarning ? (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-200">{usernameWarning}</p>
        ) : null}
        <Field label="Loại xác thực">
          <select
            className={inputClass}
            onChange={(e) => setVerificationType(e.target.value as VerificationType)}
            value={verificationType}
          >
            {ADMIN_VERIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {VERIFICATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nhãn công khai">
          <input className={inputClass} onChange={(e) => setPublicLabel(e.target.value)} value={publicLabel} />
        </Field>
        <Checkbox
          checked={publicBadgeEnabled}
          label="Hiển thị badge công khai"
          onChange={setPublicBadgeEnabled}
        />
        <Field label="Lý do nội bộ (bắt buộc)">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setAdminNote(e.target.value)} value={adminNote} />
        </Field>
        <Field label="Ghi chú gửi user nếu cần">
          <textarea className={`${inputClass} min-h-16`} onChange={(e) => setPublicNote(e.target.value)} value={publicNote} />
        </Field>
        <Checkbox
          checked={confirmed}
          label="Tôi hiểu thao tác này sẽ hiển thị badge xác thực trên tài khoản nếu bật công khai."
          onChange={setConfirmed}
        />
        {message ? <p className="text-red-300">{message}</p> : null}
        <Button disabled={isPending} onClick={submit} type="button">
          Cấp xác thực
        </Button>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-zinc-300">
      <input checked={checked} onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
