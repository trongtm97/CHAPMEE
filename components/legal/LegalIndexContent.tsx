import Link from "next/link";
import { LEGAL_BCT_DISCLAIMER, getLegalIndexSections } from "@/lib/legal-pages";

export function LegalIndexContent() {
  const sections = getLegalIndexSections();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Bộ Công Thương
        </h2>
        <p className="mt-2 text-sm leading-7 text-zinc-400">{LEGAL_BCT_DISCLAIMER}</p>
      </section>

      {sections.map(({ group, links }) => (
        <section className="space-y-3" key={group.id}>
          <h2 className="text-lg font-bold text-white">{group.title}</h2>
          <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {links.map((link) => (
              <li className="px-4 py-3" key={link.href}>
                <Link
                  className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                  href={link.href}
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
