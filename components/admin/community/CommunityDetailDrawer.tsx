"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import {
  COMMUNITY_POST_STATUS_LABELS,
  COMMUNITY_POST_TYPE_LABELS,
  COMMUNITY_RISK_LABELS
} from "@/lib/admin/community-admin-labels";
import { UserTrustScoreCard } from "@/components/admin/UserTrustScoreCard";
import {
  AUTO_DECISION_LABELS,
  reasonCodeLabel
} from "@/lib/community/auto-moderation-labels";
import type { CommunityAdminPermissions, CommunityPostDetail } from "@/types/community-admin";

type CommunityDetailDrawerProps = {
  open: boolean;
  detail: CommunityPostDetail | null;
  loading?: boolean;
  permissions: CommunityAdminPermissions;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onHide: () => void;
  onPin: () => void;
  onFeature: () => void;
  onLockComments: () => void;
  actionDisabled?: boolean;
};

function roleLabel(role: CommunityPostDetail["item"]["authorRole"]) {
  if (role === "studio") return "Tác giả";
  if (role === "admin") return "Admin";
  return "Độc giả";
}

export function CommunityDetailDrawer({
  open,
  detail,
  loading,
  permissions,
  onClose,
  onApprove,
  onReject,
  onHide,
  onPin,
  onFeature,
  onLockComments,
  actionDisabled
}: CommunityDetailDrawerProps) {
  if (!open) return null;

  const item = detail?.item;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Chi tiết bài viết</h2>
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
              <section>
                <div className="flex flex-wrap gap-2">
                  <Badge>{COMMUNITY_POST_TYPE_LABELS[item.type]}</Badge>
                  <Badge variant="warning">
                    {COMMUNITY_POST_STATUS_LABELS[item.status]}
                  </Badge>
                  <Badge>{COMMUNITY_RISK_LABELS[item.riskLevel]}</Badge>
                </div>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                  {detail.content}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {item.authorName}
                  {item.authorUsername ? ` (@${item.authorUsername})` : ""} ·{" "}
                  {roleLabel(item.authorRole)}
                  <br />
                  {new Date(item.createdAt).toLocaleString("vi-VN")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.reportCount} report · {item.commentCount} bình luận ·{" "}
                  {detail.likeCount} like
                </p>
              </section>

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Liên kết nội dung</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  {item.storyTitle ? (
                    <li>
                      Truyện:{" "}
                      {item.storySlug ? (
                        <Link
                          className="text-cyan-300 hover:text-cyan-200"
                          href={`/stories/${item.storySlug}`}
                        >
                          {item.storyTitle}
                        </Link>
                      ) : (
                        item.storyTitle
                      )}
                    </li>
                  ) : null}
                  {item.episodeLabel ? <li>Chương: {item.episodeLabel}</li> : null}
                  {item.studioName ? <li>Tác giả (Studio): {item.studioName}</li> : null}
                  {detail.publicUrl ? (
                    <li>
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        href={detail.publicUrl}
                      >
                        Mở bài công khai
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </section>

              {detail.autoDecision ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Quyết định tự động</h4>
                  <p className="mt-1 text-sm text-cyan-300/90">
                    {AUTO_DECISION_LABELS[
                      detail.autoDecision as keyof typeof AUTO_DECISION_LABELS
                    ] ?? detail.autoDecision}
                  </p>
                  {detail.autoReasonCodes.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      {detail.autoReasonCodes.map(reasonCodeLabel).join(" · ")}
                    </p>
                  ) : null}
                  {detail.matchedRules.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Rules:{" "}
                      {detail.matchedRules.map((r) => r.rule).join(", ")}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {detail.trust && item.authorUserId ? (
                <UserTrustScoreCard
                  canEdit={permissions.canModeratePosts}
                  trust={detail.trust}
                  userId={item.authorUserId}
                />
              ) : null}

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Tín hiệu rủi ro</h4>
                <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                  <li>
                    Tài khoản:{" "}
                    {detail.riskSignals.accountAgeDays != null
                      ? `${detail.riskSignals.accountAgeDays} ngày`
                      : "—"}
                  </li>
                  <li>Bài đăng hôm nay: {detail.riskSignals.postsToday}</li>
                  <li>Report trước: {detail.riskSignals.priorReports}</li>
                  <li>
                    Từ khóa chặn:{" "}
                    {detail.riskSignals.hasBlockedKeywords ? "Có" : "Không"}
                  </li>
                  <li>
                    Link ngoài: {detail.riskSignals.hasExternalLink ? "Có" : "Không"}
                  </li>
                  <li>
                    Nội dung lặp/spam:{" "}
                    {detail.riskSignals.possibleDuplicate ? "Có thể" : "Không rõ"}
                  </li>
                </ul>
              </section>

              {detail.previewComments.length > 0 ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Bình luận gần đây</h4>
                  <ul className="mt-2 space-y-2">
                    {detail.previewComments.map((c) => (
                      <li
                        className="rounded-lg border border-white/5 bg-zinc-900/60 p-2 text-sm text-zinc-400"
                        key={c.id}
                      >
                        <p className="text-xs text-zinc-500">{c.authorName ?? "—"}</p>
                        <p className="mt-1 line-clamp-3">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {permissions.canModeratePosts ? (
                <section className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  {item.status === "pending" ? (
                    <>
                      <Button
                        disabled={actionDisabled}
                        onClick={onApprove}
                        type="button"
                        variant="primary"
                      >
                        Duyệt
                      </Button>
                      <Button
                        disabled={actionDisabled}
                        onClick={onReject}
                        type="button"
                        variant="danger"
                      >
                        Từ chối
                      </Button>
                    </>
                  ) : null}
                  {item.status === "approved" ? (
                    <Button
                      disabled={actionDisabled}
                      onClick={onHide}
                      type="button"
                      variant="ghost"
                    >
                      Ẩn khỏi feed
                    </Button>
                  ) : null}
                  <Button disabled={actionDisabled} onClick={onPin} type="button" variant="ghost">
                    {item.isPinned ? "Bỏ ghim" : "Ghim trong nhóm"}
                  </Button>
                  <Button
                    disabled={actionDisabled}
                    onClick={onFeature}
                    type="button"
                    variant="ghost"
                  >
                    {item.isFeatured ? "Bỏ nổi bật" : "Đưa lên nổi bật"}
                  </Button>
                  <Button
                    disabled={actionDisabled}
                    onClick={onLockComments}
                    type="button"
                    variant="ghost"
                  >
                    {item.commentsLocked ? "Mở bình luận" : "Khóa bình luận"}
                  </Button>
                  {item.authorUsername ? (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-lg border border-zinc-700 px-3 text-sm text-zinc-300 hover:border-cyan-300/50"
                      href={getProfileUrlOrFallback(item.authorUsername)}
                    >
                      Xem hồ sơ
                    </Link>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
