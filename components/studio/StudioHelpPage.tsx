import Link from "next/link";
import { ContactChapMeeBox } from "@/components/studio/ContactChapMeeBox";
import { FAQAccordion } from "@/components/studio/FAQAccordion";
import { HelpSectionCard } from "@/components/studio/HelpSectionCard";
import { Card } from "@/components/ui";
import {
  STUDIO_HELP_LEGAL_LINKS,
  STUDIO_HELP_PAGE,
  STUDIO_HELP_SECTIONS
} from "@/lib/content/studio-help";
import type { StudioHelpPageData } from "@/lib/studio/get-studio-help-page-data";

type StudioHelpPageProps = StudioHelpPageData & {
  userEmail?: string | null;
};

export function StudioHelpPage({
  contact,
  faq,
  userEmail
}: StudioHelpPageProps) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-zinc-400">
        {STUDIO_HELP_PAGE.disclaimer}{" "}
        {STUDIO_HELP_LEGAL_LINKS.map((link, index) => (
          <span key={link.href}>
            {index > 0 ? " · " : null}
            <Link
              className="font-semibold text-sky-300 hover:text-sky-200"
              href={link.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.label}
            </Link>
          </span>
        ))}
        .
      </p>

      <Card className="p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
          Mục lục nhanh
        </p>
        <nav className="mt-3 flex flex-wrap gap-2">
          {STUDIO_HELP_SECTIONS.map((section) => (
            <a
              className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:border-sky-300/40 hover:text-sky-200"
              href={`#${section.id}`}
              key={section.id}
            >
              {section.title}
            </a>
          ))}
          <a
            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:border-sky-300/40 hover:text-sky-200"
            href="#faq"
          >
            FAQ
          </a>
          <a
            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-zinc-200 transition hover:border-sky-300/40 hover:text-sky-200"
            href="#lien-he-chapmee"
          >
            Liên hệ
          </a>
        </nav>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {STUDIO_HELP_SECTIONS.map((section) => (
          <HelpSectionCard key={section.id} section={section} />
        ))}
      </div>

      <FAQAccordion items={faq} />

      <ContactChapMeeBox settings={contact} userEmail={userEmail} />
    </div>
  );
}
