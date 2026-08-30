import type { ReactNode } from "react";
import { SectionHeading } from "@/components/seo/SectionHeading";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  as?: "h2" | "h3" | "h4";
};

export function SectionHeader({ action, as = "h2", subtitle, title }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <SectionHeading as={as} className="text-xl font-black text-white">
          {title}
        </SectionHeading>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-zinc-400">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
