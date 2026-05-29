import Link from "next/link";
import type { AdminShortcutGroup } from "@/types/admin-dashboard";

type AdminShortcutGroupsProps = {
  groups: AdminShortcutGroup[];
};

export function AdminShortcutGroups({ groups }: AdminShortcutGroupsProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Lối tắt quản trị</h2>
        <p className="text-sm text-zinc-500">Truy cập module theo nhóm chức năng.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div
            className="rounded-xl border border-white/10 bg-zinc-900/40 p-4"
            key={group.id}
          >
            <h3 className="font-semibold text-white">{group.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{group.description}</p>
            <ul className="mt-3 space-y-1">
              {group.links.map((link) => (
                <li key={`${group.id}-${link.label}`}>
                  {link.disabled ? (
                    <span className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-600">
                      {link.label}
                      <span className="text-xs text-zinc-600">
                        {link.disabledReason ?? "Đang phát triển"}
                      </span>
                    </span>
                  ) : (
                    <Link
                      className="block rounded-lg px-2 py-1.5 text-sm text-cyan-200/90 transition hover:bg-white/5 hover:text-cyan-100"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
