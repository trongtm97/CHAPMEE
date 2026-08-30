import Link from "next/link";
import {
  PRIVACY_POLICY_LABEL,
  PRIVACY_POLICY_PATH,
  TERMS_OF_SERVICE_LABEL,
  TERMS_OF_SERVICE_PATH
} from "@/lib/legal/public-legal-links";

const CONTENT_POLICY_PATH = "/legal/content-policy";
const COMMUNITY_GUIDELINES_PATH = "/community-guidelines";
const CREATOR_TERMS_PATH = "/legal/creator-terms";
const CREATOR_MONETIZATION_POLICY_PATH = "/legal/creator-monetization-policy";
const COPYRIGHT_PATH = "/legal/copyright";

const linkClass =
  "font-medium text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline";

type NoticeProps = {
  className?: string;
};

export function AuthRegisterConsentNotice({
  className = "text-center text-xs leading-relaxed text-slate-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc bấm «Đăng ký» hoặc «Tiếp tục với Google», bạn đồng ý với{" "}
      <Link className={linkClass} href={TERMS_OF_SERVICE_PATH}>
        {TERMS_OF_SERVICE_LABEL}
      </Link>{" "}
      và{" "}
      <Link className={linkClass} href={PRIVACY_POLICY_PATH}>
        {PRIVACY_POLICY_LABEL}
      </Link>{" "}
      của ChapMee.
    </p>
  );
}

export function AuthLoginConsentNotice({
  className = "text-center text-xs leading-relaxed text-slate-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc đăng nhập, bạn đồng ý với{" "}
      <Link className={linkClass} href={TERMS_OF_SERVICE_PATH}>
        {TERMS_OF_SERVICE_LABEL}
      </Link>{" "}
      và{" "}
      <Link className={linkClass} href={PRIVACY_POLICY_PATH}>
        {PRIVACY_POLICY_LABEL}
      </Link>{" "}
      của ChapMee.
    </p>
  );
}

export function PublishStoryConsentNotice({
  className = "text-xs leading-relaxed text-zinc-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Khi bạn đăng truyện, bạn xác nhận nội dung do bạn sở hữu hoặc có quyền đăng và tuân thủ{" "}
      <Link className={linkClass} href={COMMUNITY_GUIDELINES_PATH}>
        Quy định cộng đồng
      </Link>
      ,{" "}
      <Link className={linkClass} href={CONTENT_POLICY_PATH}>
        Chính sách nội dung
      </Link>
      ,{" "}
      <Link className={linkClass} href={CREATOR_TERMS_PATH}>
        Điều khoản tác giả
      </Link>{" "}
      và{" "}
      <Link className={linkClass} href={COPYRIGHT_PATH}>
        Chính sách bản quyền
      </Link>
      .
    </p>
  );
}

export function PublishEpisodeConsentNotice({
  className = "text-xs leading-relaxed text-zinc-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Khi bạn đăng chương, bạn xác nhận nội dung tuân thủ{" "}
      <Link className={linkClass} href={COMMUNITY_GUIDELINES_PATH}>
        Quy định cộng đồng
      </Link>
      ,{" "}
      <Link className={linkClass} href={CONTENT_POLICY_PATH}>
        Chính sách nội dung
      </Link>{" "}
      và phân loại độ tuổi của truyện.
    </p>
  );
}

export function ComposerWarningsConsentNotice({
  className = "text-xs leading-relaxed text-amber-100/80"
}: NoticeProps) {
  return (
    <p className={className}>
      Khi gửi duyệt hoặc đăng chương, bạn xác nhận đã xem các cảnh báo Composer và chịu trách nhiệm
      với nội dung xuất bản theo{" "}
      <Link className={linkClass} href={CONTENT_POLICY_PATH}>
        Chính sách nội dung
      </Link>
      .
    </p>
  );
}

export function AudioRightsConsentNotice({
  className = "rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-400"
}: NoticeProps) {
  return (
    <p className={className}>
      Khi bạn lưu hoặc đăng audio/video, bạn xác nhận sở hữu hoặc có quyền sử dụng nội dung và
      nguồn lưu trữ cho phép phát/nhúng trên ChapMee theo{" "}
      <Link className={linkClass} href={COPYRIGHT_PATH}>
        Chính sách bản quyền
      </Link>
      .
    </p>
  );
}

export function FilmRightsConsentNotice({
  className = "rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-400"
}: NoticeProps) {
  return (
    <p className={className}>
      Khi bạn lưu hoặc đăng video, bạn xác nhận sở hữu hoặc có quyền nhúng/chia sẻ và video liên
      quan đến truyện trên ChapMee theo{" "}
      <Link className={linkClass} href={COPYRIGHT_PATH}>
        Chính sách bản quyền
      </Link>
      .
    </p>
  );
}

export function MonetizationConsentNotice({
  className = "text-xs leading-relaxed text-zinc-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc bấm «Đăng ký bật kiếm tiền», bạn đồng ý với{" "}
      <Link className={linkClass} href={CREATOR_TERMS_PATH}>
        Điều khoản tác giả
      </Link>{" "}
      và{" "}
      <Link className={linkClass} href={CREATOR_MONETIZATION_POLICY_PATH}>
        Chính sách kiếm tiền tác giả
      </Link>
      .
    </p>
  );
}

export function VerificationConsentNotice({
  className = "text-xs leading-relaxed text-zinc-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc gửi yêu cầu xác thực, bạn xác nhận thông tin là chính xác và đồng ý để ChapMee sử
      dụng hồ sơ cho mục đích xét duyệt theo{" "}
      <Link className={linkClass} href={PRIVACY_POLICY_PATH}>
        {PRIVACY_POLICY_LABEL}
      </Link>
      .
    </p>
  );
}

export function ContentQualityResubmitConsentNotice({
  className = "text-xs leading-relaxed text-zinc-500"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc gửi xét duyệt lại, bạn xác nhận đã đọc lý do cảnh báo và đã chỉnh nội dung theo{" "}
      <Link className={linkClass} href={CONTENT_POLICY_PATH}>
        Chính sách nội dung
      </Link>
      .
    </p>
  );
}

export function ImportRightsConsentNotice({
  className = "text-xs leading-relaxed text-amber-200/90"
}: NoticeProps) {
  return (
    <p className={className}>
      Bằng việc bấm «Upload & tạo job», bạn xác nhận có quyền sử dụng nội dung trên ChapMee và
      không vi phạm bản quyền bên thứ ba theo{" "}
      <Link className={linkClass} href={COPYRIGHT_PATH}>
        Chính sách bản quyền
      </Link>
      .
    </p>
  );
}
