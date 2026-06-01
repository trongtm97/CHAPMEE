import Link from "next/link";
import { analyticsBtnGhost } from "@/components/studio/analytics/dashboard/shared/styles";

export function ShowMoreLink({ href, label = "Xem thêm" }: { href: string; label?: string }) {
  return (
    <Link className={`${analyticsBtnGhost} mt-3 inline-flex`} href={href}>
      {label}
    </Link>
  );
}
