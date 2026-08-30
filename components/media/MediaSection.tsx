import type { ReactNode } from "react";

type MediaSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function MediaSection({ title, description, children }: MediaSectionProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-zinc-50 sm:text-lg">{title}</h2>
        {description ? <p className="text-xs text-zinc-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
