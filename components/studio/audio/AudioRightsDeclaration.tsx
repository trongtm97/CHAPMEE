import { AudioRightsConsentNotice } from "@/components/legal/ImplicitConsentNotice";

export const RIGHTS_DECLARATION_LABEL =
  "Khi lưu hoặc đăng audio/video, bạn xác nhận có quyền sử dụng nội dung trên ChapMee.";

/** @deprecated Props ignored — hiển thị ghi chú đồng ý ngầm định, không còn checkbox. */
export function AudioRightsDeclaration(_props?: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return <AudioRightsConsentNotice />;
}
