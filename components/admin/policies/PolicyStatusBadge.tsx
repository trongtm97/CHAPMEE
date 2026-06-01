import type { PolicyStatus } from "@/types/policy-pages";

const STATUS_CLASS: Record<PolicyStatus, string> = {
  draft: "bg-zinc-500/15 text-zinc-300",
  published: "bg-emerald-500/15 text-emerald-200",
  archived: "bg-amber-500/15 text-amber-200"
};

export function PolicyStatusBadge({ status }: { status: PolicyStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {status}
    </span>
  );
}
