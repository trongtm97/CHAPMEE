import Link from "next/link";

type EngagementAdminHeaderProps = {
  title: string;
  description?: string;
  sectionLabel?: string;
};

export function EngagementAdminHeader({
  title,
  description,
  sectionLabel = "Admin · Trung tâm tương tác"
}: EngagementAdminHeaderProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <span className="text-zinc-600">/</span>
        <Link className="font-semibold text-cyan-300 hover:text-cyan-200" href="/admin/engagement">
          Tương tác đọc
        </Link>
      </div>
      <p className="mt-4 text-sm font-medium uppercase tracking-wide text-cyan-300">
        {sectionLabel}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-normal sm:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">{description}</p>
      ) : null}
    </div>
  );
}
