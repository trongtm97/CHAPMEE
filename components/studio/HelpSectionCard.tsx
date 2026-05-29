import Link from "next/link";
import { Card } from "@/components/ui";
import type { StudioHelpSection } from "@/lib/content/studio-help";

type HelpSectionCardProps = {
  section: StudioHelpSection;
};

export function HelpSectionCard({ section }: HelpSectionCardProps) {
  return (
    <Card
      className="scroll-mt-24 space-y-4 p-4 sm:p-5"
      id={section.id}
    >
      <div>
        <h2 className="text-lg font-bold text-white">{section.title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{section.summary}</p>
      </div>

      <ul className="space-y-4">
        {section.items.map((item) => (
          <li className="space-y-1.5" key={item.title}>
            <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
            <p className="text-sm leading-6 text-zinc-400">{item.body}</p>
            {item.links && item.links.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {item.links.map((link) => (
                  <Link
                    className="text-sm font-semibold text-sky-300 hover:text-sky-200"
                    href={link.href}
                    key={`${item.title}-${link.href}`}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    target={link.external ? "_blank" : undefined}
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
