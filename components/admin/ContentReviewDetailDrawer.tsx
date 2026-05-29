"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import {
  CONTENT_REVIEW_STATUS_LABELS,
  CONTENT_REVIEW_TYPE_LABELS
} from "@/lib/admin/content-review-reasons";
import type { ContentReviewDetail } from "@/types/admin-content-review";

type ContentReviewDetailDrawerProps = {
  open: boolean;
  detail: ContentReviewDetail | null;
  loading?: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
  onReject: () => void;
  onSendToQuality?: () => void;
  actionDisabled?: boolean;
};

export function ContentReviewDetailDrawer({
  open,
  detail,
  loading,
  onClose,
  onApprove,
  onRequestChanges,
  onReject,
  onSendToQuality,
  actionDisabled
}: ContentReviewDetailDrawerProps) {
  if (!open) return null;

  const item = detail?.item;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Chi tiết nội dung</h2>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Đang tải…</p>
          ) : !detail || !item ? (
            <p className="text-sm text-zinc-500">Không có dữ liệu.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{CONTENT_REVIEW_TYPE_LABELS[item.type]}</Badge>
                  <Badge variant="warning">
                    {CONTENT_REVIEW_STATUS_LABELS[item.status] ?? item.status}
                  </Badge>
                </div>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {item.creatorName}
                  {item.creatorUsername ? ` (@${item.creatorUsername})` : ""}
                  <br />
                  Gửi: {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>

              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="max-h-40 rounded-lg border border-white/10 object-cover"
                  src={item.coverUrl}
                />
              ) : null}

              {detail.hook ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Mô tả ngắn</h4>
                  <p className="mt-1 text-sm text-zinc-400">{detail.hook}</p>
                </section>
              ) : null}

              {detail.longDescription ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Mô tả dài</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">
                    {detail.longDescription}
                  </p>
                </section>
              ) : null}

              {detail.contentPreview ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Nội dung</h4>
                  <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-400">
                    {detail.contentPreview}
                  </p>
                </section>
              ) : null}

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Tác giả</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Truyện đã đăng: {detail.author.publishedStories}</li>
                  <li>Bị từ chối: {detail.author.rejectedCount}</li>
                  <li>Báo cáo gần đây: {detail.author.recentReports}</li>
                  {detail.author.isVerified ? <li>Có xác thực tài khoản</li> : null}
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Checklist</h4>
                <ul className="mt-2 space-y-1">
                  {detail.checklist.map((c) => (
                    <li
                      className={`text-sm ${c.passed ? "text-emerald-400" : "text-amber-400"}`}
                      key={c.id}
                    >
                      {c.passed ? "✓" : "○"} {c.label}
                    </li>
                  ))}
                </ul>
              </section>

              {detail.publicPreviewUrl ? (
                <Link
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  href={detail.publicPreviewUrl}
                  target="_blank"
                >
                  Mở xem trước công khai →
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {item && (item.status === "pending" || item.status === "changes_requested") ? (
          <div className="space-y-2 border-t border-white/10 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={actionDisabled} onClick={onApprove} type="button">
                Duyệt
              </Button>
              <Button
                disabled={actionDisabled}
                onClick={onRequestChanges}
                type="button"
                variant="secondary"
              >
                Yêu cầu sửa
              </Button>
              <Button disabled={actionDisabled} onClick={onReject} type="button" variant="danger">
                Từ chối
              </Button>
              {item.type === "story" && onSendToQuality ? (
                <Button
                  disabled={actionDisabled}
                  onClick={onSendToQuality}
                  type="button"
                  variant="secondary"
                >
                  Gửi chất lượng
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
