import Link from "next/link";
import { buildPolicyListQuery, type PolicyListFilters } from "@/lib/policies/parse-policy-filters";

type Props = {
  filters: PolicyListFilters;
  totalPages: number;
  pending?: boolean;
  onPageChange: (page: number) => void;
};

export function PolicyPagination({ filters, totalPages, pending, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Trang {filters.page}/{totalPages}
      </span>
      <div className="flex gap-3">
        {filters.page > 1 ? (
          <Link
            className={`hover:text-white ${pending ? "pointer-events-none opacity-50" : ""}`}
            href={`/admin/pages${buildPolicyListQuery({ ...filters, page: filters.page - 1 })}`}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(filters.page - 1);
            }}
          >
            Trước
          </Link>
        ) : null}
        {filters.page < totalPages ? (
          <Link
            className={`hover:text-white ${pending ? "pointer-events-none opacity-50" : ""}`}
            href={`/admin/pages${buildPolicyListQuery({ ...filters, page: filters.page + 1 })}`}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(filters.page + 1);
            }}
          >
            Sau
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
