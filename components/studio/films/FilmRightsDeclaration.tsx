import { FilmRightsConsentNotice } from "@/components/legal/ImplicitConsentNotice";

export const FILM_RIGHTS_DECLARATION_LABEL =
  "Khi lưu hoặc đăng video, bạn xác nhận có quyền nhúng/chia sẻ trên ChapMee.";

/** @deprecated Props ignored — hiển thị ghi chú đồng ý ngầm định, không còn checkbox. */
export function FilmRightsDeclaration(_props?: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return <FilmRightsConsentNotice />;
}
